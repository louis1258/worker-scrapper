const waitForElement = require("./utils/checkElement");
const fs = require('fs');
const puppeteer = require('puppeteer');
const path = require('path');
const https = require('https');
const axios = require('axios');
const { upload, createComic, createChapter, createComicType } = require("./api");
const createSlug = require("./utils/slug");
const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');
const randomDelay = async (min = 500, max = 1500) => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise((resolve) => setTimeout(resolve, delay));
};
const userAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
const proxyUrl = 'hndc21.proxyxoay.net:32051';  // Replace with your actual proxy URL and port
const proxyUsername = 'louis1258';
const proxyPassword = 'Htn@1258';
const apiKey = '6f7badf1-a51f-4f47-9b1b-daaf0f713b70';
const userAgentList = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
];
async function fetchWithRetry(src, retries = 3, delay = 20000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(src, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
                    'Referer': 'https://truyenqqto.com/',
                },
                timeout: 10000 // Optional timeout for fetch in milliseconds
            });

            console.log(`Attempt ${attempt}: Fetch Response Status:`, response.status);
            if(response.status===504){
                return false;
            }
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            return await response.arrayBuffer(); // Use response.text() or response.json() if needed
        } catch (error) {
            console.error(`Attempt ${attempt} failed for ${src}:`, error);

            if (attempt < retries) {
                console.log(`Retrying in ${delay} ms...`);
                await new Promise(res => setTimeout(res, delay));
            } else {
                console.error(`Failed to fetch after ${retries} attempts`);
                throw new Error("retry faild"); // Re-throw the error after the final failed attempt
            }
        }
    }
}
async function gotoWithRetry(page, url, maxRetries = 3) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            await randomDelay(100, 500);
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 200000 });
            return true; // Thành công, thoát vòng lặp
        } catch (error) {
            console.error(`Failed to load ${url} (Attempt ${retries + 1} of ${maxRetries}):`, error);
            retries += 1;
            if (retries < maxRetries) {
                console.log(`Retrying ${url}...`);
            } else {
                console.error(`All retry attempts failed for ${url}`);
                throw new Error('All retry attempts failed')
            }
        }
    }
}
const scraperObject = {
    url: 'https://truyenqqto.com',
    async scraper(browser) {



        let dataObj = {};
        browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium-browser',  args: ['--disable-gpu', '--disable-setuid-sandbox', '--no-sandbox', '--no-zygote', `--proxy-server=${proxyUrl}`] })


        // Loop through each of those links, open a new page instance, and get the relevant data
        let pagePromise = async (payload) => {
            const newPage = await browser.newPage();
            // Set API key in request headers
            await newPage.setExtraHTTPHeaders({
                'Authorization': `Bearer ${apiKey}`,
                'Referer': 'https://truyenqqto.com/',
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
            });
            const randomIndex = Math.floor(Math.random() * userAgentList.length);
            userAgentList[randomIndex];
            await newPage.setUserAgent(userAgentList[randomIndex]);
            // Authenticate with proxy using username and password
            await newPage.authenticate({
                username: proxyUsername,
                password: proxyPassword
            });

            try {
                await gotoWithRetry(newPage, payload.chapter, 3);

                // Use $eval to extract image sources for the chapter
                await waitForElement(newPage, '.page-chapter > img.lazy');
                const imagesSrc = await newPage.$$eval('.page-chapter > img.lazy', images => {
                    return images.map(img => img.src); // Extract 'src' attributes
                });

                // Process each image source
                let uploadedImageResults
                try {
                    uploadedImageResults = await Promise.all(
                        imagesSrc.map(async (src, imageIndex) => {
                            try {
                                // Kiểm tra nếu src không tồn tại
                                if (!src) {
                                    throw new Error(`Image source not found for index: ${imageIndex}`);
                                }

                                // Fetch image as ArrayBuffer
                                const arrayBuffer = await fetchWithRetry(src);
                                if(arrayBuffer===false){
                                    return null
                                }
                                const buffer = Buffer.from(arrayBuffer);
                                const base64String = buffer.toString('base64');
                                const ext = src.split('.').pop().split('?')[0];

                                // Tạo chuỗi base64 đầy đủ
                                const fullBase64String = `data:image/${ext};base64,${base64String}`;
                                const match = fullBase64String.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
                                if (!match) {
                                   return
                                }

                                // Tạo file và lưu vào hệ thống
                                const imgExt = match[1];
                                const data = match[2];
                                const finalBuffer = Buffer.from(data, 'base64');
                                const uniqueFileName = `chapter_image_${payload.order}_${payload.comic}${imageIndex}_${uuidv4()}.${imgExt}`;
                                const filePath = path.join(__dirname, uniqueFileName);
                                fs.writeFileSync(filePath, finalBuffer);
                                try {
                                    const url = await upload(uniqueFileName);
                                    return url
                                } catch (error) {
                                    throw new Error("Error uploading")
                                }
                            } catch (error) {
                                console.error(`Error processing image at index ${imageIndex}:`, error.message);
                                throw new Error("Error upload chapter")
                            }
                        })
                    );
                } catch (error) {
                    console.error("Image upload failed, stopping process:", error.message);
                    throw new Error("failed to upload");
                }

                const chapterData = {
                    comic: `${payload.comic}`,
                    order: `${payload.order}`,
                    title: `Chapter ${payload.order}`,
                    images: uploadedImageResults.filter(url => url) // Filter out any null results
                };

                // Save chapter data to your database or perform any action with it
                const chapterCreate = await createChapter(chapterData);
                return chapterCreate;
            } catch (err) {
                console.error(`Error scraping link: `, err);
                await newPage.close();
                throw new Error("Failed to scrape");
            }
            finally {
                await newPage.close();
            }
        };

        let scrapedData = [];
        const queue = 'crawlQueue';

        // Loop through all the URLs and fetch data from each
        const connection = await amqp.connect("amqp://your_username:your_password@77.237.236.3:5672");
        const channel = await connection.createChannel();
        await channel.prefetch(1);
        // Ensure the queue exists
        await channel.assertQueue(queue, { durable: true });

        console.log(`✅ Waiting for tasks in queue: ${queue}`);
        // Consume messages from the queue
        channel.consume(queue, async (message) => {
            if (message !== null) {
                const task = JSON.parse(message.content.toString()); // Convert string to JSON
                console.log(`📥 Received task: ${task.chapter}`); // Access the correct href property
                try {
                    // Process the task here
                    const currentPageData = await pagePromise(task);
                    scrapedData.push(currentPageData);
                    console.log(`✅ Task completed: ${task.chapter}`);
                    channel.ack(message); // Acknowledge the message after successful processing
                } catch (error) {
                    console.error(`❌ Error processing task: ${task.href}`, error);
                    // Optionally, you can reject the message or handle it as needed
                    channel.nack(message); // If you want to requeue the message
                }
            }
        }, {
            noAck: false // Ensure messages are acknowledged after processing
        });

    }
};

module.exports = scraperObject;


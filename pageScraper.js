const waitForElement = require("./utils/checkElement");
const fs = require('fs');
const puppeteer = require('puppeteer');
const path = require('path');
const https = require('https');
const axios = require('axios');
const { upload, createComic, createChapter, createComicType } = require("./api");
const createSlug = require("./utils/slug");
const amqp = require('amqplib');
const randomDelay = async (min = 500, max = 1500) => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise((resolve) => setTimeout(resolve, delay));
};
const userAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
const proxyUrl = 'hndc31.proxyxoay.net:15925';  // Replace with your actual proxy URL and port
const proxyUsername = 'louis1258';
const proxyPassword = 'Htn@1258';
const apiKey = '6c1be37c-bbcf-425f-ad20-3c3d4ef2f7bd';
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
                throw error; // Re-throw the error after the final failed attempt
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
                return false; // Tất cả retry đều thất bại
            }
        }
    }
}
const scraperObject = {
    url: 'https://truyenqqto.com',
    async scraper(browser) {



        let dataObj = {};
        browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium-browser', args: ['--disable-gpu', '--disable-setuid-sandbox', '--no-sandbox', '--no-zygote', `--proxy-server=${proxyUrl}`] })


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
                const imagesSrc = await newPage.$$eval('.page-chapter > img.lazy', images => {
                    return images.map(img => img.src); // Extract 'src' attributes
                });

                // Process each image source
                const uploadedImageUrls = await Promise.all(
                    imagesSrc.map(async (src, imageIndex) => {
                        if (src) {
                            try {
                                const arrayBuffer = await fetchWithRetry(src); // Get the image as ArrayBuffer
                                const buffer = Buffer.from(arrayBuffer); // Convert ArrayBuffer to Buffer
                                const base64String = buffer.toString('base64'); // Convert buffer to base64
                                const ext = src.split('.').pop().split('?')[0]; // Extract the extension from the URL


                                // Construct the full base64 string
                                const fullBase64String = `data:image/${ext};base64,${base64String}`;

                                // Check the format of the full base64 string
                                const match = fullBase64String.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
                                if (match) {
                                    const imgExt = match[1];  // Image format
                                    const data = match[2]; // Base64 data
                                    const finalBuffer = Buffer.from(data, 'base64'); // Convert base64 data to buffer

                                    // Create the file path for each chapter image
                                    const filePath = path.join(__dirname, `chapter_image_${payload.order}_${payload.comic}${imageIndex}.${imgExt}`);
                                    // Save the image to the filesystem
                                    fs.writeFileSync(filePath, finalBuffer);
                                    console.log('Image saved at:', filePath); // Log file save confirmation

                                    // Upload the image after saving
                                    const url = await upload(`chapter_image_${payload.order}_${payload.comic}${imageIndex}.${imgExt}`); // Upload the image
                                    return url; // Return the uploaded image URL
                                } else {
                                    console.error('Base64 string format is incorrect after construction.');
                                }
                            } catch (error) {
                                console.error(`Error fetching or processing the image from ${src}:`, error);
                                return null; // Return null if there's an error
                            }
                        }
                        return null; // Return null if there's no valid src
                    })
                );

                const chapterData = {
                    comic: `${payload.comic}`,
                    order: `${payload.order}`,
                    title: `Chapter ${payload.order}`,
                    images: uploadedImageUrls.filter(url => url) // Filter out any null results
                };

                // Save chapter data to your database or perform any action with it
                const chapterCreate = await createChapter(chapterData);
                console.log(chapterCreate);
                return chapterCreate;
            } catch (err) {
                console.error(`Error scraping link: `, err);
                await newPage.close();
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
                console.log(`📥 Received task: ${task.href}`); // Access the correct href property

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


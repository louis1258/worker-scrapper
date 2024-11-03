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
user_agent_list = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
]
const userAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
const proxyUrl = 'hndc21.proxyxoay.net:32051';  // Replace with your actual proxy URL and port
const proxyUsername = 'louis1258';
const proxyPassword = 'Htn@1258';
const apiKey = 'e2d48a85-ba4a-4bf1-9170-7a2f02cde6ab';
const userAgentList = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
];
const scraperObject = {
    url: 'https://truyenqqto.com',
    async scraper(browser) {



        let dataObj = {};
         browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium-browser', args: ['--disable-gpu', '--disable-setuid-sandbox', '--no-sandbox', '--no-zygote', `--proxy-server=${proxyUrl}`] })

        
        // Loop through each of those links, open a new page instance, and get the relevant data
        let pagePromise = async (link) => {
            const newPage = await browser.newPage();
            // Set API key in request headers
            await newPage.setExtraHTTPHeaders({
                'Authorization': `Bearer ${apiKey}`
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
                await newPage.goto(link, { waitUntil: 'domcontentloaded', timeout: 20000 });
		    // const ads = await newPage.$('#popup-truyenqq > div > div > .popup-icon-close > #close-popup-truyenqq');

                // if (ads) {
                //     console.warn('Popup ad detected! Closing it...');
                //     await newPage.click('#close-popup-truyenqq');
                //     console.log('Popup closed');
                // }

                // Scrape the title or any other details from the individual book page
                //newPage.$eval('.book_detail > .book_info > .book_avatar > img', img => img.src);
                await randomDelay(100, 500);
                const coverImageSrc = await newPage.$eval(
                    '.book_detail > .book_info > .book_avatar > img',
                    img => img ? img.src : null
                );

                console.log('Cover Image Source:', coverImageSrc); // Log the image source

                if (!coverImageSrc) {
                    console.error('Cover image not found');
                    return null;
                }

                try {
                    const response = await fetch(coverImageSrc, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
                            'Referer': 'https://truyenqqto.com/',
                        }
                    });

                    console.log('Fetch Response Status:', response.status); // Check fetch status

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const arrayBuffer = await response.arrayBuffer(); // Get the image as ArrayBuffer
                    const buffer = Buffer.from(arrayBuffer); // Convert ArrayBuffer to Buffer
                    const base64String = buffer.toString('base64'); // Convert buffer to base64
                    const ext = coverImageSrc.split('.').pop().split('?')[0]; // Extract the extension from the URL


                    // Construct the full base64 string
                    const fullBase64String = `data:image/${ext};base64,${base64String}`;

                    // Check the format of the full base64 string
                    const match = fullBase64String.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
                    if (match) {
                        const imgExt = match[1];  // Image format
                        const data = match[2]; // Base64 data
                        const finalBuffer = Buffer.from(data, 'base64'); // Convert base64 data to buffer

                        // Create the file path
                        const filePath = path.join(__dirname, `cover_image.${imgExt}`);
                        // Save the image to the filesystem
                        fs.writeFileSync(filePath, finalBuffer);

                        // Upload the image after saving
                        const url = await upload(`cover_image.${imgExt}`); // Ensure you use the correct file path for upload
                        dataObj['coverImage'] = url;
                    } else {
                        console.error('Base64 string format is incorrect after construction.');
                    }
                } catch (error) {
                    console.error(`Error fetching or processing the image from ${coverImageSrc}:`, error);
                }

                // Now that you have the base64 string in `dataObj['coverImage']`, save it and upload
                // if (dataObj['coverImage']) {
                //     // Extract the image format (jpeg/png) from the base64 string
                //     const match = dataObj['coverImage'].match(/^data:image\/(png|jpeg);base64,(.+)$/);
                //     if (match) {
                //         const ext = match[1];  // Image format
                //         const data = match[2]; // Base64 data
                //         const buffer = Buffer.from(data, 'base64');
                //         // Create the file path
                //         const filePath = path.join(__dirname, `cover_image.${ext}`);
                //         // Save the image to the filesystem
                //         fs.writeFileSync(filePath, buffer);
                //         // Upload the image after saving
                //         const url = await upload(`cover_image.${ext}`);
                //         dataObj['coverImage'] = url
                //     }
                // } else {
                //     console.error('No cover image to save or upload.');
                // }
                dataObj['title'] = await newPage.$eval('.book_detail > .book_info > .book_other > h1', title => title.textContent);
                dataObj['genres'] = await newPage.$$eval('.book_detail > .book_info > .book_other > .list01 .li03 > a', genres => {
                    return genres.map(genre => genre.textContent.trim());  // Extract and trim the text content of each genre
                });

                const dataComicType = {
                    name: 'Truyện tranh',
                    description: "Thể loại có nội dung trong sáng và cảm động, thường có các tình tiết gây cười, các xung đột nhẹ nhàng",
                    status: "Active",
                }
                const typeComicArray = await Promise.all(
                    dataObj['genres'].map(async (type) => {
                        dataComicType.name = type;
                        const typeComic = await createComicType(dataComicType);
                        return typeComic._id; // Trả về _id của ComicType
                    })
                );

                dataObj['genres'] = typeComicArray
                const check = await waitForElement(newPage, '.book_detail > .story-detail-info.detail-content');
                dataObj['description'] = await newPage.evaluate(() => {
                    const checkInner = document.querySelector('body > div.content > div.div_middle > div.main_content > div.book_detail > div.story-detail-info.detail-content.readmore-js-section.readmore-js-collapsed > p');
                    if (checkInner)
                        return checkInner.textContent.trim();
                    else {
                        const checkOuter = document.querySelector('body > div.content > div.div_middle > div.main_content > div.book_detail > div.story-detail-info.detail-content > p')
                        return checkOuter.textContent.trim();
                    }
                });

                console.log(dataObj['description']);
                // Scrape chapters
                dataObj.slug = createSlug(dataObj.title)
                const resultComic = await createComic(dataObj);
                console.log('Comic created:', resultComic);

             
                dataObj['chapter'] = await newPage.$$eval(
                    'body > div.content > div.div_middle > div.main_content > div.book_detail > div.list_chapter > div > .works-chapter-item',
                    chapters => {
                        return chapters.map(chapter => {
                            const linkElement = chapter.querySelector('a');
                            return {
                                title: linkElement.textContent.trim(),
                                link: linkElement.href
                            };
                        });
                    }
                );

                // Fetch chapter content
                for (const [index, chapter] of dataObj['chapter'].reverse().entries()) {
                    console.log(chapter);
                    try {
                        await randomDelay(100, 500);
            await newPage.goto(chapter.link, { waitUntil: 'domcontentloaded', timeout: 20000 });

                    } catch (error) {
                        console.error(`Failed to load ${chapter.link}:`, error);
                        continue; // Skip to the next chapter
                    }

                    // Use $eval to extract image sources for the chapter
                    const imagesSrc = await newPage.$$eval('.page-chapter > img.lazy', images => {
                        return images.map(img => img.src); // Extract 'src' attributes
                    });

                    // Process each image source
                    const uploadedImageUrls = await Promise.all(
                        imagesSrc.map(async (src, imageIndex) => {
                            if (src) {
                                try {
                                    // Fetch the image with proper headers
                                    const response = await fetch(src, {
                                        headers: {
                                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
                                            'Referer': 'https://truyenqqto.com/',
                                        }
                                    });

                                    console.log('Fetch Response Status:', response.status); // Log fetch status

                                    if (!response.ok) {
                                        throw new Error(`HTTP error! status: ${response.status}`);
                                    }

                                    const arrayBuffer = await response.arrayBuffer(); // Get the image as ArrayBuffer
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
                                        const filePath = path.join(__dirname, `chapter_image_${index}_${imageIndex}.${imgExt}`);
                                        // Save the image to the filesystem
                                        fs.writeFileSync(filePath, finalBuffer);
                                        console.log('Image saved at:', filePath); // Log file save confirmation

                                        // Upload the image after saving
                                        const url = await upload(`chapter_image_${index}_${imageIndex}.${imgExt}`); // Upload the image
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

                    // Save the uploaded image URLs to the chapter data
                    const chapterData = {
                        comic: `${resultComic._id}`,
                        order: index,
                        title: `${chapter.title}`,
                        images: uploadedImageUrls.filter(url => url) // Filter out any null results
                    };

                    // Save chapter data to your database or perform any action with it
                    const chapterCreate = await createChapter(chapterData);
                }



                return dataObj;
            } catch (err) {
                console.error(`Error scraping link: ${link}`, err);
                await newPage.close();
            }
            finally{
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
                    const currentPageData = await pagePromise(task.href);
                    scrapedData.push(currentPageData);
                    console.log(`✅ Task completed: ${task.href}`);
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


        // After all scraping is done, close the browser
        // await browser.close();
    }
};

module.exports = scraperObject;


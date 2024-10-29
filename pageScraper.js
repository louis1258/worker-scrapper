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
const proxyUrl = 'hndc8.proxyxoay.net:44499';  // Replace with your actual proxy URL and port
const proxyUsername = 'louis1258';
const proxyPassword = 'Htn@1258';
const apiKey = '1d9607b7-4840-4ce2-b1b1-fbb273e9913f';

const scraperObject = {
    url: 'https://truyenqqto.com',
    async scraper(browser) {

    
    

        // Loop through each of those links, open a new page instance, and get the relevant data
        let pagePromise = async (link) => {
            console.log(link, 'link');

            let dataObj = {};
            // const browser = await puppeteer.launch({
            //     headless: false,
            //     args: [`--proxy-server=${proxyUrl}`] // Set proxy server
            // });
        
        
            const newPage = await browser.newPage();
            // Set API key in request headers
            // await newPage.setExtraHTTPHeaders({
            //     'Authorization': `Bearer ${apiKey}`
            // });
            await newPage.setUserAgent(userAgent);
            // // Authenticate with proxy using username and password
            // await newPage.authenticate({
            //     username: proxyUsername,
            //     password: proxyPassword
            // });
            try {
                await randomDelay(300, 1000);
                await newPage.goto(link, { waitUntil: 'networkidle2' });
                // const ads = await newPage.$('#popup-truyenqq > div > div > .popup-icon-close > #close-popup-truyenqq');

                // if (ads) {
                //     console.warn('Popup ad detected! Closing it...');
                //     await newPage.click('#close-popup-truyenqq');
                //     console.log('Popup closed');
                // }

                // Scrape the title or any other details from the individual book page
                //newPage.$eval('.book_detail > .book_info > .book_avatar > img', img => img.src);
                await randomDelay(300, 1000);
                dataObj['coverImage'] = await newPage.evaluate(async () => {
                    const img = document.querySelector('.book_detail > .book_info > .book_avatar > img');
                    const src = img ? img.src : null;

                    if (!src) {
                        console.error('Cover image not found');
                        return null;
                    }

                    try {
                        // Fetch the image as a blob
                        const response = await fetch(src);
                        const blob = await response.blob();

                        // Convert blob to base64
                        const base64String = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });

                        return base64String; // Return the base64 string to Node.js context
                    } catch (error) {
                        console.error('Error fetching or processing the image:', error);
                        return null;
                    }
                });
        
               
                // Now that you have the base64 string in `dataObj['coverImage']`, save it and upload
                if (dataObj['coverImage']) {
                    // Extract the image format (jpeg/png) from the base64 string
                    const match = dataObj['coverImage'].match(/^data:image\/(png|jpeg);base64,(.+)$/);
                    if (match) {
                        const ext = match[1];  // Image format
                        const data = match[2]; // Base64 data
                        const buffer = Buffer.from(data, 'base64');
                        // Create the file path
                        const filePath = path.join(__dirname, `cover_image.${ext}`);
                        // Save the image to the filesystem
                        fs.writeFileSync(filePath, buffer);
                        // Upload the image after saving
                        const url = await upload(`cover_image.${ext}`);
                        dataObj['coverImage'] = url
                    }
                } else {
                    console.error('No cover image to save or upload.');
                }
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

                const checkChapter = await waitForElement(newPage, 'body > div.content > div.div_middle > div.main_content > div.book_detail > div.list_chapter > div');

                dataObj['chapter'] = await newPage.evaluate(() => {
                    const chapters = [];
                    const checkInner = document.querySelectorAll('body > div.content > div.div_middle > div.main_content > div.book_detail > div.list_chapter > div > .works-chapter-item');
                    checkInner.forEach(chapter => {
                        const linkElement = chapter.querySelector('a');
                        chapters.push({
                            title: linkElement.textContent.trim(),
                            link: linkElement.href
                        });
                    });
                    return chapters;
                });

                // Fetch chapter content
                for (const [index, chapter] of dataObj['chapter'].reverse().entries()) {
                    console.log(chapter);
                    try {
                        await newPage.goto(chapter.link, { waitUntil: 'networkidle2', timeout: 20000 });
                    } catch (error) {
                        console.error(`Failed to load ${chapter.link}:`, error);
                        continue; // Skip to the next chapter
                    }
                    // const checkChapter = await waitForElement(newPage, '.page-chapter img.lazy');

                    // dataObj['images'] = await newPage.$$eval('.page-chapter img.lazy', images => {
                    //     return images.map(image => image.src); // Extracting the 'src' attribute
                    // });
                    console.log('================================');
                    const checkChapter = await waitForElement(newPage, '.page-chapter > img.lazy');

                    dataObj['images'] = await newPage.evaluate(async () => {
                        const content = document.querySelectorAll('.page-chapter > img.lazy');  // Update your selector if needed

                        // Fetch images and convert to base64
                        const imagePromises = Array.from(content).map(async (chapter) => {
                            if (chapter.src) {
                                try {
                                    // Fetch the image as a blob
                                    const response = await fetch(chapter.src);
                                    const blob = await response.blob();

                                    // Convert blob to base64
                                    return new Promise((resolve, reject) => {
                                        const reader = new FileReader();
                                        reader.onloadend = () => resolve(reader.result);
                                        reader.onerror = reject;
                                        reader.readAsDataURL(blob);
                                    });
                                } catch (error) {
                                    return null;
                                }
                            } else {
                                return null;
                            }
                        });

                        // Wait for all image promises to resolve
                        const images = await Promise.all(imagePromises);
                        return images.filter(img => img !== null); // Filter out null results
                    });

                    const chapterData = {
                        comic: `${resultComic._id}`,
                        order: index ,
                        title: `${resultComic.title} - ${chapter.title}`,
                        images: []
                    }
                    // dataObj['images'].forEach(async (base64String, index) => {
                    //     if (base64String) {
                    //         // Extract the image format (jpeg/png) from the base64 string
                    //         const match = base64String.match(/^data:image\/(png|jpeg);base64,(.+)$/);
                    //         if (match) {
                    //             const ext = match[1];  // Image format
                    //             const data = match[2]; // Base64 data
                    //             const buffer = Buffer.from(data, 'base64');

                    //             // Create the file path
                    //             const filePath = path.join(__dirname, `image_${index}.${ext}`);

                    //             // Save the image to the filesystem
                    //             fs.writeFileSync(filePath, buffer);

                    //             if (index != 0) {
                    //                     const url = await upload(`image_${index}.${ext}`);
                    //                     chapterData.images.push(url);
                    //             }
                    //         }
                    //     }
                    // });

                    const uploadedUrls = await Promise.all(
                        dataObj['images'].map(async (base64String, index) => {
                            if (base64String) {
                                // Extract the image format (jpeg/png) from the base64 string
                                const match = base64String.match(/^data:image\/(png|jpeg);base64,(.+)$/);
                                if (match) {
                                    const ext = match[1];  // Image format
                                    const data = match[2]; // Base64 data
                                    const buffer = Buffer.from(data, 'base64');

                                    // Create the file path
                                    const filePath = path.join(__dirname, `image_${index}.${ext}`);

                                    // Save the image to the filesystem
                                    fs.writeFileSync(filePath, buffer);

                                    if (index != 0) {
                                        // Use a promise to wait for the upload to complete
                                        await new Promise((resolve) => setTimeout(resolve, 1000));
                                        const url = await upload(`image_${index}.${ext}`);
                                        return url;
                                    }
                                }
                            }
                            return null; // In case there's no base64String, return null
                        })
                    );
                    chapterData.images = uploadedUrls.filter(url => url); // Filter out null results
                    const chapterCreate = await createChapter(chapterData);
                    // await newPage.close();
                }


                return dataObj;
            } catch (err) {
                console.error(`Error scraping link: ${link}`, err);
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

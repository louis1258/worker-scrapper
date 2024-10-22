const waitForElement = require("./utils/checkElement");
const fs = require('fs');
const path = require('path');
const https = require('https');
const axios = require('axios');
const { upload, createComic } = require("./api");
const createSlug = require("./utils/slug");
const scraperObject = {
    url: 'https://truyenqqto.com',
    async scraper(browser) {
        let page = await browser.newPage();
        console.log(`Navigating to ${this.url}...`);
        let urls;
        const navigationPromise = page.waitForNavigation({ waitUntil: "domcontentloaded" });

        try {
            await page.goto(this.url, { waitUntil: 'networkidle2' });

            // Wait for the list to load
            await navigationPromise;
            await page.waitForSelector('#list_new');

            // Scrape all hrefs inside the a tags within the li elements
            urls = await page.$$eval('#list_new li .book_avatar a', links => {
                return links.map(link => link.href);  // Extract href attribute
            });

            console.log('Scraped hrefs:', urls);
        } catch (error) {
            console.error(`Error during scraping:`, error);
        } finally {
            await page.close(); // Close the main page after scraping
        }

        // Loop through each of those links, open a new page instance, and get the relevant data
        let pagePromise = async (link) => {
            console.log(link, 'link');

            let dataObj = {};
            const newPage = await browser.newPage();
            try {
                await newPage.goto(link);
                // const ads = await newPage.$('#popup-truyenqq > div > div > .popup-icon-close > #close-popup-truyenqq');

                // if (ads) {
                //     console.warn('Popup ad detected! Closing it...');
                //     await newPage.click('#close-popup-truyenqq');
                //     console.log('Popup closed');
                // }

                // Scrape the title or any other details from the individual book page
                //newPage.$eval('.book_detail > .book_info > .book_avatar > img', img => img.src);
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

                const check = await waitForElement(newPage, '.book_detail > .story-detail-info.detail-content');
                dataObj['description'] = await newPage.evaluate(() => {
                    const checkInner = document.querySelector('body > div.content > div.div_middle > div.main_content > div.book_detail > div.story-detail-info.detail-content.readmore-js-section.readmore-js-collapsed > p');
                    return checkInner ? checkInner.textContent.trim() : '';
                });

                // Scrape chapters
                dataObj.slug = createSlug(dataObj.title)
                const result = await createComic(dataObj);
                console.log('Comic created:', result);

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
                for (const chapter of dataObj['chapter']) {
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

                    dataObj['images'].forEach(async (base64String, index) => {
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
                                    setTimeout(async () => {
                                        const url = await upload(`image_${index}.${ext}`);
                                        return url;
                                    }, 1000)
                                }
                            }
                        }
                    });
                    console.log(dataObj['images'], 'dataObj');
                    // await newPage.close();
                }


                return dataObj;
            } catch (err) {
                console.error(`Error scraping link: ${link}`, err);
                await newPage.close();
            }
        };

        let scrapedData = [];
        // Loop through all the URLs and fetch data from each
        for (let i = 0; i < 1; i++) {
            try {
                let currentPageData = await pagePromise(urls[i]);
                if (currentPageData) {
                    scrapedData.push(currentPageData);
                }
            } catch (error) {
                console.error(`Error scraping link: ${link}`, error);
            }
        }

        // After all scraping is done, close the browser
        await browser.close();
    }
};

module.exports = scraperObject;

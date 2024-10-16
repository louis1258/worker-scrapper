
const scraperObject = {
    url: 'https://truyenqqto.com',
    async scraper(browser) {
        let page = await browser.newPage();
        console.log(`Navigating to ${this.url}...`);
        let urls;

        try {
            await page.goto(this.url, { waitUntil: 'networkidle2' });

            // Wait for the list to load
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
        let pagePromise = (link) => new Promise(async (resolve, reject) => {
            console.log(link, 'link');
            let dataObj = {};
            try {
                let newPage = await browser.newPage();
                await newPage.goto(link);
                await newPage.waitForSelector('.book_detail > .story-detail-info.detail-content > p'); // Tăng thời gian chờ lên 60 giây

                // Scrape the title or any other details from the individual book page
                dataObj['avatar'] = await newPage.$eval('.book_detail > .book_info > .book_avatar > img', img => img.src);
                dataObj['title'] = await newPage.$eval('.book_detail > .book_info > .book_other > h1', title => title.textContent);
                dataObj['genres'] = await newPage.$$eval('.book_detail > .book_info > .book_other > .list01 .li03 > a', genres => {
                    return genres.map(genre => genre.textContent.trim());  // Extract and trim the text content of each genre
                });
                await newPage.waitForSelector('.book_detail >.story-detail-info.detail-content > p');
                dataObj['description'] = await newPage.$eval('.book_detail >.story-detail-info.detail-content > p', description => description.textContent);
                // Other scraping logic here (like price, description, etc.)

                await newPage.close();
                resolve(dataObj);
            } catch (err) {
                reject(err);
            }
        })
        let scrapedData = [];

        // Loop through all the URLs and fetch data from each
        for (let link of urls) {
            try {
                let currentPageData = await pagePromise(link);
                scrapedData.push(currentPageData);
                console.log(currentPageData);
            } catch (error) {
                console.error(`Error scraping link: ${link}`, error);
            }
        }
        // After all scraping is done, close the browser
        await browser.close();
    }
}

module.exports = scraperObject;
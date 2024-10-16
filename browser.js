const puppeteer = require('puppeteer-extra');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
const adblocker = AdblockerPlugin({
  blockTrackers: true // default: false
})
puppeteer.use(adblocker)

async function startBrowser(){
    let browser;
    try {
        console.log("Opening the browser......");
        browser = await puppeteer.launch({
            headless: false,
            args: ["--disable-setuid-sandbox"],
            'ignoreHTTPSErrors': true
        });
    } catch (err) {
        console.error("Could not create a browser instance => ", err);
    }
    return browser;
}

module.exports = {
    startBrowser
};

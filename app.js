import puppeteer from 'puppeteer';

  async function scrape_price(url)
{

    let price;
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    let text = await page.evaluate(() => {
        return document.querySelector("#app-container > div > div > div.jsx-3523574269.jsx-549221746.main > div.jsx-1588473315.sp-overview-root.animation-container > div.jsx-1588473315.mob--only > div.jsx-3168773259.quote-box-root > span.jsx-3168773259.current-price.typography-h1.text-primary").textContent;
    });
    price = text;
    browser.close();
    return price;
}
export {scrape_price as scrape_price};



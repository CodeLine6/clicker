const fs = require("fs");
//Enable stealth mode
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { humanMouseMovement, randomDelay, randomBetween, simulateReading, randomPageInteractions } = require("./lib/utils");
const Click = require("./models/clicks");
const connectToMongo = require("./db");
puppeteer.use(StealthPlugin());
connectToMongo();

const SEARCH_ENGINE = "bing";

const SEARCH_ENGINE_CONFIG = {
  google: {
    url: "https://www.google.com/",
    search_input_selector: 'form[action="/search"] textarea[name="q"]',
    search_result_selector: "div#search div.dURPMd > div.MjjYud",
    sponsored_result_selector: "div#tvcap > div > div:nth-child(4)",
    link_selector: "a",
  },
  bing: {
    url: "https://www.bing.com/",
    search_input_selector: 'form[action="/search"] textarea[name="q"]',
    search_result_selector: "li.b_algo",
    sponsored_result_selector: "li.b_ad > ul > li > div",
    link_selector: "h2 a",
  },
};

const TARGET = "https://www.namecheap.com";
const KEYWORD = "cheap hosting";


const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const click = async () => {
  let click_count = 0;

    const browser = await puppeteer.launch({
      headless: false,
      ignoreHTTPSErrors: true, // ignore SSL errors
    });

  const page = await browser.newPage();
  await page.goto(SEARCH_ENGINE_CONFIG[SEARCH_ENGINE]["url"]);
  await page.waitForSelector(
    SEARCH_ENGINE_CONFIG[SEARCH_ENGINE]["search_input_selector"]
  );

  await delay(2000);

  await page.type(
    SEARCH_ENGINE_CONFIG[SEARCH_ENGINE]["search_input_selector"],
    KEYWORD
  );

  await page.screenshot({ path: "search_input.png" });
  await page.keyboard.press("Enter");
  await page.waitForNavigation({ waitUntil: "networkidle0" });
  await page.screenshot({ path: "search_results.png" });

  fs.writeFileSync("search_results.html", await page.content());

  await page.waitForSelector(
    SEARCH_ENGINE_CONFIG[SEARCH_ENGINE]["search_result_selector"]
  );

  const sponsored_results = await page.$$(
    SEARCH_ENGINE_CONFIG[SEARCH_ENGINE]["sponsored_result_selector"]
  );

  await page.click

  for (let i = 0; i < sponsored_results.length; i++) {
    const sponsored_result = sponsored_results[i];
    
    try {
        // Check if content of the sponsored result contains the target domain
        const content = await sponsored_result.evaluate(
            (element) => {
                return element.textContent || element.innerText || '';
            }
        );
        
        if (TARGET && !content.includes(TARGET)) {
            continue;
        }
        
        // Add human-like delay before interaction
        await randomDelay(500, 1500);
        // Realistic mouse movement to the sponsored result
        const box = await sponsored_result.boundingBox();
        if (box) {
            await humanMouseMovement(page, box.x + box.width / 2, box.y + box.height / 2);
            await randomDelay(200, 800);
        }
        
        // Find the link
        const link = await sponsored_result.$(
            SEARCH_ENGINE_CONFIG[SEARCH_ENGINE]["link_selector"]
        );  
        
        // Move mouse to the actual link with realistic movement
        const linkBox = await link.boundingBox();
        if (linkBox) {
            await humanMouseMovement(page, 
                linkBox.x + randomBetween(5, linkBox.width - 5), 
                linkBox.y + randomBetween(5, linkBox.height - 5)
            );
            await randomDelay(300, 800);
        }

        const linkUrl = await link.evaluate(el => el.getAttribute('href'));
        
        // Get current pages count
        const pagesBefore = await browser.pages(); 
        // Click the link with realistic timing
        link.evaluate(el => el.click())
        // Wait for potential new tab or navigation
        await new Promise(resolve => setTimeout(resolve, 2000));

        
        // Check if new tab opened
        const pagesAfter = await browser.pages();
        let targetPage = page;
        
        if (pagesAfter.length > pagesBefore.length) {
            
            const newClick = new Click({ 
              url: linkUrl, 
              click_count: 1, 
              timestamp: new Date(), 
              keyword: KEYWORD, 
              target: TARGET ? TARGET : 'All',
              search_engine: SEARCH_ENGINE
            });
            await newClick.save();
            // New tab opened
            targetPage = pagesAfter[pagesAfter.length - 1];
            // Wait for new page to load
            await targetPage.waitForSelector('body', { timeout: 30000 });
            await randomDelay(1000, 2000);

            // Human-like delay after page load
            await randomDelay(2000, 4000);
            // Simulate reading/scanning behavior with mouse movements
            await simulateReading(targetPage);
            // Random interactions with realistic mouse movements
            await randomPageInteractions(targetPage);
            // Simulate time spent on page
            await randomDelay(5000, 15000);
        } 
        
        // Handle navigation back
        if (targetPage !== page) {
            // Close new tab
            await targetPage.close();
        }
        
        click_count++;
        
        // Add delay between processing different sponsored results
        await randomDelay(3000, 8000);
        
    } catch (error) {
        console.error(`Error processing sponsored result ${i}:`, error);
        continue;
    }
  }

  await browser.close();
  return click_count;
};

async function clicker() {
  const TOTAL_CLICKS = 5;
  let current_clicks = 0;
  while (current_clicks < TOTAL_CLICKS) {
    try {
      const click_count = await click();
      current_clicks += click_count;
    } catch (error) {
      break;
    }
  }
}

clicker();
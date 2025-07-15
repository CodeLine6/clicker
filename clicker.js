// clicker.js - Updated with full data capture
const fs = require("fs");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { v4: uuidv4 } = require('uuid'); // Add to package.json
const { humanMouseMovement, randomDelay, randomBetween, simulateReading, randomPageInteractions } = require("./lib/utils");
const Click = require("./models/clicks");

puppeteer.use(StealthPlugin());

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

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function click({sessionId, searchTerm: KEYWORD, searchEngine: SEARCH_ENGINE, target: TARGET})  {
  let click_count = 0;

  const browser = await puppeteer.launch({
    headless: false,
    ignoreHTTPSErrors: true,
  });

  const page = await browser.newPage();
  const userAgent = await page.evaluate(() => navigator.userAgent);
  
  await page.goto(SEARCH_ENGINE_CONFIG[SEARCH_ENGINE]["url"]);
  await page.waitForSelector(SEARCH_ENGINE_CONFIG[SEARCH_ENGINE]["search_input_selector"]);
  await delay(2000);

  await page.type(SEARCH_ENGINE_CONFIG[SEARCH_ENGINE]["search_input_selector"], KEYWORD);
  await page.screenshot({ path: "search_input.png" });
  await page.keyboard.press("Enter");
  await page.waitForNavigation({ waitUntil: "networkidle0" });
  await page.screenshot({ path: "search_results.png" });

  fs.writeFileSync("search_results.html", await page.content());

  await page.waitForSelector(SEARCH_ENGINE_CONFIG[SEARCH_ENGINE]["search_result_selector"]);

  const sponsored_results = await page.$$(SEARCH_ENGINE_CONFIG[SEARCH_ENGINE]["sponsored_result_selector"]);

  for (let i = 0; i < sponsored_results.length; i++) {
    const sponsored_result = sponsored_results[i];
    const position = i + 1; // Track ad position
    let timeOnPage = 0;
    let interactionCount = 0;
    let success;
    let errorMessage = null;
    let linkUrl = null;

    try {
      // Check if content contains target domain
      const content = await sponsored_result.evaluate(element => {
        return element.textContent || element.innerText || '';
      });

      if (TARGET && !content.includes(TARGET)) {
        continue;
      }

      await randomDelay(500, 1500);
      
      // Realistic mouse movement
      const box = await sponsored_result.boundingBox();
      if (box) {
        await humanMouseMovement(page, box.x + box.width / 2, box.y + box.height / 2);
        await randomDelay(200, 800);
      }

      // Find and click the link
      const link = await sponsored_result.$(SEARCH_ENGINE_CONFIG[SEARCH_ENGINE]["link_selector"]);
      
      if (!link) {
        throw new Error("Link not found in sponsored result");
      }

      const linkBox = await link.boundingBox();
      if (linkBox) {
        await humanMouseMovement(page, 
          linkBox.x + randomBetween(5, linkBox.width - 5), 
          linkBox.y + randomBetween(5, linkBox.height - 5)
        );
        await randomDelay(300, 800);
      }

      linkUrl = await link.evaluate(el => el.getAttribute('href'));
      
      // Track timing
      const startTime = Date.now();
      
      const pagesBefore = await browser.pages();
      await link.evaluate(el => el.click());
      await new Promise(resolve => setTimeout(resolve, 2000));

      const pagesAfter = await browser.pages();
      let targetPage = page;

      if (pagesAfter.length > pagesBefore.length) {
        targetPage = pagesAfter[pagesAfter.length - 1];
        await targetPage.waitForSelector('body', { timeout: 30000 });
        await randomDelay(1000, 2000);

        // Simulate human behavior and count interactions
        await randomDelay(2000, 4000);
        
        // Simulate reading
        await simulateReading(targetPage);
        interactionCount += 3; // Reading counts as interactions
        
        // Random page interactions
        const interactions = await randomPageInteractions(targetPage);
        interactionCount += interactions;
        
        // Simulate time spent on page
        const additionalTime = randomBetween(5000, 15000);
        await randomDelay(additionalTime);
        
        timeOnPage = Date.now() - startTime;
        success = true;
      }

      else  {
        success = false;
      }

      try {
        const newClick = new Click({
          url: linkUrl || 'Unknown',
          timestamp: new Date(),
          keyword: KEYWORD,
          target: TARGET || 'All',
          search_engine: SEARCH_ENGINE,
          position: position,
          time_on_page: timeOnPage,
          interactions: interactionCount,
          session_id: sessionId,
          user_agent: userAgent,
          success: success,
          error_message: errorMessage
        });
        
        await newClick.save();
        console.log(`Click saved: ${success ? 'Success' : 'Failed'} - Position: ${position}, Time: ${timeOnPage}ms`);
      } catch (saveError) {
        console.error('Error saving click data:', saveError);
      }

      // Handle navigation back
      if (targetPage !== page) {
        await targetPage.close();
      }

      click_count++;
      await randomDelay(3000, 8000);

    } catch (error) {
      console.error(`Error processing sponsored result ${i}:`, error);
      errorMessage = error.message;
      success = false;
      timeOnPage = Date.now() - (Date.now() - 1000); // Minimal time if failed
    }
  }

  await browser.close();
  return click_count;
};

function clicker(clickerConfig) {

  let running = true;
    
    // Listen for custom events on process
  process.on('stopLoop', () => {
        console.log('Custom stop signal received');
        running = false;
  });

  let current_clicks = 0;
  const sessionId = uuidv4();

  (async function () {
    while (running) {
      try {
        current_clicks++;
        await click({sessionId, ...clickerConfig});
        console.log(`Completed ${current_clicks} clicks`);
      } catch (error) {
        console.error('Error in clicker loop:', error);
        break;
      }
    }

    process.emit('loopStopped');
  })();

  return { success: running, message: 'Clicker started', sessionId };
}


module.exports = { clicker };
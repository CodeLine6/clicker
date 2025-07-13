export async function humanMouseMovement(page, targetX, targetY) {
    // Get current mouse position
    const currentPos = await page.evaluate(() => {
        return {
            x: window.lastMouseX || Math.random() * window.innerWidth,
            y: window.lastMouseY || Math.random() * window.innerHeight
        };
    });
    
    const startX = currentPos.x;
    const startY = currentPos.y;
    
    // Calculate distance and steps
    const distance = Math.sqrt(Math.pow(targetX - startX, 2) + Math.pow(targetY - startY, 2));
    const steps = Math.max(10, Math.floor(distance / 20)); // More steps for longer distances
    
    // Create realistic curved path
    for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        
        // Ease-in-out animation
        const easeProgress = progress < 0.5 ? 
            2 * progress * progress : 
            1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        // Add slight curve to movement
        const curve = Math.sin(progress * Math.PI) * randomBetween(-20, 20);
        
        // Calculate position with curve
        const x = startX + (targetX - startX) * easeProgress + curve * 0.5;
        const y = startY + (targetY - startY) * easeProgress + randomBetween(-5, 5);
        
        // Move mouse
        await page.mouse.move(x, y);
        
        // Variable speed - slower at start and end
        const speed = progress < 0.1 || progress > 0.9 ? 
            randomBetween(20, 40) : 
            randomBetween(10, 25);
        
        await new Promise(resolve => setTimeout(resolve, speed));
    }
    
    // Store final position
    await page.evaluate((x, y) => {
        window.lastMouseX = x;
        window.lastMouseY = y;
    }, targetX, targetY);
}

export async function simulateReading(page) {
    try {
        // Get text elements
        const textElements = await page.$$('h1, h2, h3, p');
        const elementsToRead = textElements.slice(0, 3);
        
        for (const element of elementsToRead) {
            try {
                // Get element position
                const box = await element.boundingBox();
                if (box) {
                    // Move mouse to element area while reading
                    await humanMouseMovement(page, 
                        box.x + randomBetween(10, box.width - 10), 
                        box.y + randomBetween(5, box.height - 5)
                    );
                    
                    // Scroll element into view
                    await element.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
                    
                    // Simulate reading time with occasional small mouse movements
                    const readingTime = randomBetween(1000, 3000);
                    const microMovements = Math.floor(readingTime / 500);
                    
                    for (let j = 0; j < microMovements; j++) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        // Small random mouse movements while reading
                        const currentPos = await page.evaluate(() => ({
                            x: window.lastMouseX || 0,
                            y: window.lastMouseY || 0
                        }));
                        
                        await page.mouse.move(
                            currentPos.x + randomBetween(-10, 10),
                            currentPos.y + randomBetween(-5, 5)
                        );
                    }
                }
            } catch (e) {
                // Continue if element interaction fails
            }
        }
    } catch (error) {
        console.error('Error in simulateReading:', error);
    }
}

// lib/utils.js - Updated randomPageInteractions to return count
export async function randomPageInteractions(page) {
    const numInteractions = randomBetween(1, 3);
    let actualInteractions = 0;
    
    for (let i = 0; i < numInteractions; i++) {
        const action = Math.random();
        
        try {
            if (action < 0.3) {
                // Scroll with mouse movement
                await page.evaluate(() => {
                    window.scrollBy(0, Math.random() * 300 + 100);
                });
                
                await new Promise(resolve => setTimeout(resolve, 200));
                await page.mouse.move(
                    randomBetween(100, 800),
                    randomBetween(100, 600)
                );
                actualInteractions++;
                
            } else if (action < 0.6) {
                // Hover over clickable elements
                const clickableElements = await page.$$('a, button, input[type="submit"]');
                if (clickableElements.length > 0) {
                    const randomElement = clickableElements[Math.floor(Math.random() * clickableElements.length)];
                    const box = await randomElement.boundingBox();
                    if (box) {
                        await humanMouseMovement(page, 
                            box.x + box.width / 2, 
                            box.y + box.height / 2
                        );
                        await new Promise(resolve => setTimeout(resolve, randomBetween(300, 800)));
                        actualInteractions++;
                    }
                }
            } else {
                // Text selection behavior
                const textElements = await page.$$('p, div, span');
                if (textElements.length > 0) {
                    const randomElement = textElements[Math.floor(Math.random() * textElements.length)];
                    const box = await randomElement.boundingBox();
                    if (box) {
                        await humanMouseMovement(page, box.x + 10, box.y + 10);
                        await page.mouse.down();
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        await page.mouse.move(
                            box.x + randomBetween(50, Math.min(200, box.width - 20)),
                            box.y + randomBetween(5, Math.min(30, box.height - 5))
                        );
                        await page.mouse.up();
                        
                        await new Promise(resolve => setTimeout(resolve, 300));
                        await page.mouse.click(box.x + box.width + 10, box.y);
                        actualInteractions++;
                    }
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, randomBetween(500, 1500)));
        } catch (error) {
            console.error('Error in interaction:', error);
        }
    }
    
    return actualInteractions;
}

export function randomDelay(min, max) {
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
}
 
export function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
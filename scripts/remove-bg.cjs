const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

const imageDir = path.join(__dirname, '../public/image');
const tolerance = 0.15; // 15% tolerance for white

async function processImage(filePath) {
    try {
        const image = await Jimp.read(filePath);

        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            const red = this.bitmap.data[idx + 0];
            const green = this.bitmap.data[idx + 1];
            const blue = this.bitmap.data[idx + 2];
            const alpha = this.bitmap.data[idx + 3];

            // If pixel is white-ish
            if (red > 240 && green > 240 && blue > 240) {
                this.bitmap.data[idx + 3] = 0; // Set alpha to 0
            }
        });

        // Ensure we save as PNG to support transparency
        const newPath = path.parse(filePath).name + '.png';
        const finalPath = path.join(imageDir, newPath);

        await image.writeAsync(finalPath);
        console.log(`Processed: ${filePath} -> ${finalPath}`);

        // If original was jpg, maybe delete it? kept for safety for now.
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
    }
}

async function main() {
    if (!fs.existsSync(imageDir)) {
        console.error("Image directory not found:", imageDir);
        return;
    }

    const files = fs.readdirSync(imageDir);
    for (const file of files) {
        // Process png and jpg
        if (file.match(/\.(png|jpg|jpeg)$/i) && file !== 'logo.png') {
            await processImage(path.join(imageDir, file));
        }
    }
}

main();

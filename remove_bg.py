import os
from PIL import Image

def remove_white_bg(image_path, tolerance=200):
    try:
        img = Image.open(image_path)
        img = img.convert("RGBA")
        datas = img.getdata()

        newData = []
        for item in datas:
            # Check if pixel is close to white
            if item[0] > tolerance and item[1] > tolerance and item[2] > tolerance:
                newData.append((255, 255, 255, 0)) # Make Transparent
            else:
                newData.append(item)

        img.putdata(newData)
        
        # Save as PNG (overwrite or new file)
        # If it was JPG, we must change extension to PNG
        file_name, ext = os.path.splitext(image_path)
        new_path = file_name + ".png"
        img.save(new_path, "PNG")
        print(f"Processed: {image_path} -> {new_path}")
        
    except Exception as e:
        print(f"Error processing {image_path}: {e}")

image_dir = "public/image"
files = os.listdir(image_dir)

for file in files:
    if file.lower().endswith(('.png', '.jpg', '.jpeg')):
        full_path = os.path.join(image_dir, file)
        remove_white_bg(full_path)

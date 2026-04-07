# YouTube Bot Error Fix — Step by Step

## Step 1: cookies.txt banao (apne PC pe, sirf ek baar)

1. Chrome browser kholo
2. Is link pe jao aur extension install karo:
   https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc

3. YouTube.com pe jao aur LOGIN karo apne account se

4. Extension ka icon click karo (top right mein puzzle piece icon)
   → "Export" ya "🍪 Get cookies.txt" click karo
   → File save ho jaayegi: "youtube.com_cookies.txt" ya "cookies.txt"

5. File ka naam rename karo sirf: cookies.txt

## Step 2: cookies.txt GitHub pe daalo

1. Apna GitHub repo kholo:
   https://github.com/rajraushankumar/rajraushan_downloader

2. "Add file" → "Upload files" click karo

3. cookies.txt drag karke upload karo
   (rajraushan_downloader/ folder ke andar — app.py ke saath)

4. "Commit changes" click karo

## Step 3: Render redeploy ho jaayega automatically

Bas itna! Render khud redeploy kar dega.
Phir YouTube download hoga bina error ke. ✅

## IMPORTANT
- Repo PRIVATE rakhna — cookies se account hack ho sakta hai public repo mein!
- Agar 2-3 mahine baad phir error aaye to cookies.txt dobara export karke upload karo

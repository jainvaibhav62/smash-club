const MAX_SOURCE_FILE_BYTES = 8 * 1024 * 1024 // 8MB, before compression

/** Center-crops to a square and downscales/compresses to a small JPEG data URL,
 * so profile photos can be stored directly on the Firestore doc without needing
 * Cloud Storage (which requires the paid Blaze plan). */
export function resizeImageToDataUrl(file: File, targetSize = 200, quality = 0.82): Promise<string> {
  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error('Please choose an image file.'))
  }
  if (file.size > MAX_SOURCE_FILE_BYTES) {
    return Promise.reject(new Error('Image is too large (max 8MB).'))
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the selected file.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Could not load the selected image.'))
      img.onload = () => {
        const side = Math.min(img.width, img.height)
        const sx = (img.width - side) / 2
        const sy = (img.height - side) / 2

        const canvas = document.createElement('canvas')
        canvas.width = targetSize
        canvas.height = targetSize
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Image processing is not supported in this browser.'))
          return
        }
        ctx.drawImage(img, sx, sy, side, side, 0, 0, targetSize, targetSize)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

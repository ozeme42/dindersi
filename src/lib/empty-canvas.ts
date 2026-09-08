// Mock canvas module for browser / bundler compatibility (e.g. pdfjs-dist)
const emptyCanvas = {
    createCanvas: () => ({
        getContext: () => null,
    }),
    createImageData: () => ({}),
    loadImage: () => Promise.resolve({}),
};

export default emptyCanvas;
export const createCanvas = emptyCanvas.createCanvas;
export const createImageData = emptyCanvas.createImageData;
export const loadImage = emptyCanvas.loadImage;

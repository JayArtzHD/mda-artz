/**
 * Reads a JSON array of product metadata and emits:
 * 1) SEO JSON files in build/seo/{handle}.json
 * 2) A CSV file for PinGenerator at build/pins/pins.csv
 *
 * Expected input shape:
 * {
 *   handle: string;
 *   title: string;
 *   description: string;
 *   alt: string;
 *   board: string;
 *   url: string;
 *   tags: string[];
 *   image_url: string;
 * }
 */

import * as fs from 'fs';
import * as path from 'path';

interface ProductInput {
  handle: string;
  title: string;
  description: string;
  alt: string;
  board: string;
  url: string;
  tags: string[];
  image_url: string;
}

function truncateText(inputText: string, maxLength: number): string {
  return inputText.length > maxLength ? inputText.slice(0, maxLength).trim() : inputText.trim();
}

function validateContentForBannedWords(contentText: string): void {
  const bannedWords = ['pink', 'rainbow'];
  if (process.env.ALLOW_PASTEL === 'true') return;
  bannedWords.forEach(bannedWord => {
    if (new RegExp(`\\b${bannedWord}\\b`, 'i').test(contentText)) {
      throw new Error(`Banned word "${bannedWord}" detected in: ${contentText}`);
    }
  });
}

function generateSeoFiles(products: ProductInput[]): void {
  products.forEach(product => {
    validateContentForBannedWords(product.title);
    validateContentForBannedWords(product.description);
    validateContentForBannedWords(product.alt);
    const seoMetadata = {
      product_handle: product.handle,
      meta_title: truncateText(product.title, 60),
      meta_description: truncateText(product.description, 160),
      image_alt_text: truncateText(product.alt, 150),
    };
    const outputDirectory = path.join('build', 'seo');
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(outputDirectory, `${product.handle}.json`),
      JSON.stringify(seoMetadata, null, 2),
      'utf8',
    );
  });
}

function generatePinterestCsv(products: ProductInput[]): void {
  const csvRows = [
    ['Title', 'Description', 'Alt Text', 'Board', 'URL', 'Tags', 'Image_URL'].join(','),
  ];
  products.forEach(product => {
    validateContentForBannedWords(product.title);
    validateContentForBannedWords(product.description);
    validateContentForBannedWords(product.alt);
    const sanitizedTitle = truncateText(product.title, 60).replace(/"/g, '');
    const sanitizedDescription = truncateText(product.description, 160).replace(/"/g, '');
    const sanitizedAltText = truncateText(product.alt, 150).replace(/"/g, '');
    const joinedTags = product.tags.join(' ');
    const csvRow = [sanitizedTitle, sanitizedDescription, sanitizedAltText, product.board, product.url, joinedTags, product.image_url]
      .map(field => (field.includes(',') ? `"${field}"` : field))
      .join(',');
    csvRows.push(csvRow);
  });
  const outputDirectory = path.join('build', 'pins');
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, 'pins.csv'), csvRows.join('\n'), 'utf8');
}

function main(): void {
  const [inputFilePath] = process.argv.slice(2);
  if (!inputFilePath) {
    console.error('Usage: node mdz-seo-pins.js <input-json>');
    process.exit(1);
  }
  const rawJsonContent = fs.readFileSync(inputFilePath, 'utf8');
  const products: ProductInput[] = JSON.parse(rawJsonContent);
  generateSeoFiles(products);
  generatePinterestCsv(products);
  console.log(`Generated SEO and pins files for ${products.length} products.`);
}

if (require.main === module) {
  main();
}

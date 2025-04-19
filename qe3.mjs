import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { faker } from '@faker-js/faker';
import fs from 'fs';
import axios from 'axios';
import ora from 'ora';
import cliProgress from 'cli-progress';

puppeteer.use(StealthPlugin());

const proxyListFile = './testedProxies.txt';
const usedProxyFile = './usedProxies.txt';
const ipCacheFile = './ipCountryCache.json';

const loadProxiesFromFile = () => {
  if (!fs.existsSync(proxyListFile)) return [];
  return fs.readFileSync(proxyListFile, 'utf-8')
    .split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 0);
};

const isProxyUsed = (proxy) => {
  if (!fs.existsSync(usedProxyFile)) return false;
  const used = fs.readFileSync(usedProxyFile, 'utf-8').split('\n');
  return used.includes(proxy);
};

const markProxyAsUsed = (proxy) => {
  fs.appendFileSync(usedProxyFile, proxy + '\n', 'utf-8');
};

const loadIpCountryCache = () => {
  if (!fs.existsSync(ipCacheFile)) return {};
  return JSON.parse(fs.readFileSync(ipCacheFile, 'utf-8'));
};

const saveIpCountryCache = (cache) => {
  fs.writeFileSync(ipCacheFile, JSON.stringify(cache, null, 2), 'utf-8');
};

const getCountryFromIp = async (ip, cache) => {
  if (cache[ip]) return cache[ip];
  try {
    const res = await axios.get(`https://ipapi.co/${ip}/country_name/`);
    const country = res.data.trim();
    cache[ip] = country;
    saveIpCountryCache(cache);
    return country;
  } catch (e) {
    cache[ip] = 'Unknown';
    saveIpCountryCache(cache);
    return 'Unknown';
  }
};

const getNextProxy = async (allProxies, cache) => {
  const unused = allProxies.filter(p => !isProxyUsed(p));
  if (unused.length === 0) return null;

  for (const proxy of unused) {
    const ip = proxy.split(':')[0];
    const country = await getCountryFromIp(ip, cache);
    console.log(`🌍 Mencoba proxy: ${proxy} dari ${country}`);
    return proxy;
  }

  return null;
};

const locales = ['en_US', 'en_GB', 'fr_FR', 'de_DE', 'es_ES', 'ja_JP'];
const randomUserAgent = () => faker.internet.userAgent();

const headersTemplate = () => ({
  'Accept-Language': faker.helpers.arrayElement(locales),
  'User-Agent': randomUserAgent(),
  'X-Forwarded-For': faker.internet.ip(),
  'X-Real-IP': faker.internet.ip(),
  'Referer': faker.internet.url(),
  'Origin': faker.internet.url(),
  'DNT': '1',
  'Connection': 'keep-alive',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
});

let browser, page, selectedProxy;

const randomDelay = (min = 1000, max = 3000) =>
  new Promise(res => setTimeout(res, Math.floor(Math.random() * (max - min)) + min));

const simulateInteraction = async () => {
  try {
    await page.mouse.move(Math.random() * 500, Math.random() * 300);
    await randomDelay(500, 1500);
    await page.keyboard.press('ArrowDown');
    await randomDelay(1000, 2000);
  } catch (e) {
    // ignore
  }
};

const watchVideo = async (url, proxies, cache) => {
  const loadSpinner = ora(`Menonton video dengan proxy: ${selectedProxy}`).start();

  try {
    const headers = headersTemplate();
    await page.setExtraHTTPHeaders(headers);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });

    await page.waitForSelector('video', { timeout: 60000 });
    await page.evaluate(() => document.querySelector('video').play());
    await page.evaluate(() => {
      const video = document.querySelector('video');
      video.playbackRate = 1.25;
    });

    loadSpinner.text = 'Menonton secara realistis...';
    await simulateInteraction();
    await randomDelay(60000, 90000); // 1–1.5 menit

    loadSpinner.succeed('Selesai menonton. Ganti proxy...');
    markProxyAsUsed(selectedProxy);

    const newProxy = await getNextProxy(proxies, cache);
    if (!newProxy) return console.log('🚫 Tidak ada proxy baru tersedia.');

    selectedProxy = newProxy;
    await browser.close();
    browser = await puppeteer.launch({
      args: [`--proxy-server=socks5://${selectedProxy}`]
    });
    page = await browser.newPage();

    return await watchVideo(url, proxies, cache);
  } catch (error) {
    loadSpinner.fail(`❌ Proxy gagal: ${selectedProxy} - ${error.message}`);
    markProxyAsUsed(selectedProxy);

    const newProxy = await getNextProxy(proxies, cache);
    if (!newProxy) return console.log('🚫 Tidak ada proxy baru tersedia.');

    selectedProxy = newProxy;
    await browser.close();
    browser = await puppeteer.launch({
      args: [`--proxy-server=socks5://${selectedProxy}`]
    });
    page = await browser.newPage();

    return await watchVideo(url, proxies, cache);
  }
};

(async () => {
  const proxies = loadProxiesFromFile();
  if (proxies.length === 0) return console.error('⚠️ Tidak ada proxy ditemukan di testedProxies.txt');

  const ipCountryCache = loadIpCountryCache();

  const bar = new cliProgress.SingleBar({
    format: '📊 Mengecek proxy |{bar}| {percentage}% | {value}/{total} proxy',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });

  bar.start(proxies.length, 0);
  for (const _ of proxies) bar.increment();
  bar.stop();

  selectedProxy = await getNextProxy(proxies, ipCountryCache);
  if (!selectedProxy) return console.error('❌ Tidak ada proxy yang bisa digunakan.');

  browser = await puppeteer.launch({
    args: [`--proxy-server=socks5://${selectedProxy}`]
  });
  page = await browser.newPage();

  const videoUrls = [
    'https://www.youtube.com/watch?v=bFa1Xu25vqM',
  ];

  for (const url of videoUrls) {
    await watchVideo(url, proxies, ipCountryCache);
  }

  await browser.close();
})();

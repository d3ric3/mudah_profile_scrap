const puppeteer = require('puppeteer');
const addDays = require('date-fns/addDays');
const format = require('date-fns/format');

var date_text = { 
    today: format(new Date(), 'dd MMM'), 
    yesterday: format(addDays(new Date(), -1), 'dd MMM') 
};

(async () => {

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://www.mudah.my/kong-flp-realty-sdn-bhd?f=q', { waitUntil: "networkidle2" });

    const pagination_urls = await getPaginationLinks(page);

    var all_ads_data = [];

    for (const url of pagination_urls) {
        console.log(url);
        const page_ads_data = await scrapAdsDataByUrl(page, url);
        all_ads_data = [...all_ads_data, ...page_ads_data];
    }

    await browser.close();

    console.log(all_ads_data.length);
})();

async function getPaginationLinks(page) {
    // determine the total number of pagination count and get the links
    const data = await page.evaluate(() => {
        return new Promise((resolve, reject) => {
            try{ 
                const ads_count = Number.parseInt(document.querySelector('div.store-info.current-available').innerText.replace('Current Ads Available', ''));
                const page_count = Math.ceil(ads_count / 40);
                const non_active_page_link_element = document.querySelector('span.FloatLeft.nav-next-btn > span.non-active > a');
                var paging_url = "";
                var paging_urls = [];
                var page_param_index = 0;
                var page_param = "";

                // sample: https://www.mudah.my/li?o=2&ca=9_s&id=481282&f=q
                if(non_active_page_link_element != null) {
                    paging_url = non_active_page_link_element.href;
                    page_param_index = paging_url.indexOf('o=');
                    page_param = paging_url.substring(page_param_index, page_param_index + 3);

                    for(i=0; i<page_count; i++) {
                        paging_urls.push(paging_url.replace(page_param, `o=${i+1}`))
                    }
                    console.log(paging_urls);
                }

                resolve(paging_urls);
            }
            catch(err) {
                reject(err);
            }
        });
    });

    return data;
}

async function scrapAdsDataByUrl(page, url) {
    await page.goto(url, { waitUntil: "networkidle2" });

    const ads = await page.evaluate((date_text) => { 
        return new Promise((resolve, reject) => {
            try{
                let items = [];

                // featured section
                let featuredSection = document.querySelector('.list-featured');
                let title = featuredSection.querySelector('.list_title').innerText;
                let price = featuredSection.querySelector('.ads_price > div.ads_price').innerText;
                let url = featuredSection.querySelector('div.list-featured > a').getAttribute('href');
                let area = featuredSection.querySelector('div.area').innerText.trim();
                let date_time = featuredSection.querySelector('div[title="Date & Location"] > div').innerText.replace('Today', date_text.today).replace('Yesterday', date_text.yesterday);
                let category = featuredSection.querySelector('div[title="Category"]').innerText.trim();
                let size = null;

                items.push({
                    title, 
                    price,
                    url,
                    area,
                    date_time,
                    category,
                    size
                });

                // ads section
                let adsSections = document.querySelectorAll('.footerline');
                adsSections.forEach((adsSection) => {
                    let title = adsSection.querySelector('h2.list_title > a').innerText;
                    let price = adsSection.querySelector('.ads_price > div.ads_price').innerText;
                    let url = adsSection.querySelector('h2.list_title > a').getAttribute('href');
                    let area = adsSection.querySelector('div.area').innerText.trim();
                    let date_time = adsSection.querySelector('div[title="Date & Location"] > div').innerText.replace('Today', date_text.today).replace('Yesterday', date_text.yesterday);
                    let category = adsSection.querySelector('div[title="Category"]').parentElement.innerText.trim();
                    let size = adsSection.querySelector('div.icon_label.size').parentElement.innerText.trim();

                    items.push({
                        title, 
                        price,
                        url,
                        area,
                        date_time,
                        category,
                        size
                    });
                });

                resolve(items);
            }
            catch(err) {
                reject(err);
            }
        });
    }, date_text);

    return ads;
}
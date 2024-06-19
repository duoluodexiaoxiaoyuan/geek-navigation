const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

require('dotenv').config({path: path.resolve(__dirname, '../../.env')});

const knex = require('knex')({
    client: 'mysql',
    connection: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'geek_nav'
    }
});

function getCategoryData() {
    let categoryList = []
    request.post({
        url: 'https://nav.poetries.top/',
    }, function(err, response, body) {
        const $ = cheerio.load(body);

        $('.sidebar-item').each((index, element) => {
        
            const categoryName = $(element).find('>a>span').text();
            
            const categoryItem = {
                name: categoryName,
                children: []
            }
            
            const children = $(element).find('>ul');
            if (children) {
                $(element).find('>ul>li').each((index, child) => {
                    const itemId = $(child).find('a').attr('href');

                    if (itemId && itemId.includes('#')) {
                        const item = $(child).find('span').text();
                        categoryItem.children.push({
                            name: item,
                            id: itemId.split('-')[1]
                        })
                    }
                
                })
            }

            categoryList.push(categoryItem)
        })
        categoryList = categoryList.filter(item=> item.children.length>0)
        console.log(JSON.stringify(categoryList))
        //存本地
        fs.writeFileSync(path.resolve(__dirname, 'category.json'), JSON.stringify(categoryList, null, 4));
    })
}


async function getCategoryNavData(categoryId = '62') {
    const options = {
        url: 'https://nav.poetries.top/wp-admin/admin-ajax.php',
        headers: {
          'accept': 'text/html, */*; q=0.01',
          'accept-language': 'zh,en-US;q=0.9,en;q=0.8,zh-CN;q=0.7',
          'cache-control': 'no-cache',
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'pragma': 'no-cache',
          'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Microsoft Edge";v="122"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          'x-requested-with': 'XMLHttpRequest',
          'cookie': 'Hm_lvt_4e454a224b62939250ef6754edff7ce9=1718548825; Hm_lpvt_4e454a224b62939250ef6754edff7ce9=1718548825',
          'Referer': 'https://nav.poetries.top/',
          'Referrer-Policy': 'strict-origin-when-cross-origin'
        },
        form: {
          id: categoryId,
          taxonomy: 'favorites',
          action: 'load_home_tab',
          post_id: '0'
        }
      };
      
      return new Promise((resolve, reject) => {
        request.post(options, function(err, response, body) {
            if (err) {
              console.error('发生错误:', err);
            } else {
              // console.log('接口返回的数据：', body);
              const $ = cheerio.load(body);
              const navList = []
          
              $('.url-card').each((index, element) => {
                  const $element = $(element);
                  
                  // 获取链接
                  let navUrl = $element.find('.url-body>a').attr('href').split('url=')[1] ;
                  const navName = $element.find('.url-body .url-content strong').text().trim();
                  const navDesc = $element.find('.url-body .url-content p').text().trim();
                  let navIcon = $element.find('.url-body .url-content img').attr('data-src')
                 
                  console.log('navIcon:', navIcon);
                  let iconFileName = navIcon.substring(navIcon.lastIndexOf('/') + 1);
                //   // 取后缀名
                //   const iconSuffix = iconFileName.substring(iconFileName.lastIndexOf('.'));

                //   // 取导航名称作为icon文件名，中文要转换，去掉/\等字符
                //   iconFileName = navName.replace(/[\\/:*?"<>|]/g, "") + iconSuffix;

                // 取当前日期作为目录，日期格式为: 2022-01-01
                  const date = new Date();
                  const year = date.getFullYear();
                  const month = date.getMonth() + 1;
                  const day = date.getDate();
                  const navDir = `${year}-${month}-${day}`

                // 上传icon
                if (!fs.existsSync(path.resolve(__dirname, `../upload/nav/${navDir}`))) {
                    fs.mkdirSync(path.resolve(__dirname, `../upload/nav/${navDir}`));
                }

                  const iconFilePath = path.resolve(__dirname, `../upload/nav/${navDir}/${iconFileName}`);
                  request(navIcon).pipe(fs.createWriteStream(iconFilePath));

                  navIcon = `/nav/upload/nav/${navDir}/${iconFileName}`
                  navUrl = atob(decodeURIComponent(navUrl))
                  navList.push({navUrl, navName, navDesc, navIcon})
              });
              resolve(navList)

            }
          });
      })
      
}


(async ()=> {
    const categoryList = []
    const navList = []
   

    let [{maxCategoryId: categoryIdSequence}] = await knex('category').max('idSequence as maxCategoryId')
    let [{maxNavId: navIdSequence}] = await knex('nav').max('idSequence as maxNavId')



    console.log('categoryIdSequence:', categoryIdSequence, 'navIdSequence:', navIdSequence);


    // 使用await，读category.json，取到导航
    let categoryNavList = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'category.json'), 'utf-8'));
    
    // 只取name为前端导航的数据
    categoryNavList = categoryNavList.filter(item => item.name === '前端导航');

    console.log(categoryNavList);
    for (const category of categoryNavList) {
        //添加父分类
        categoryIdSequence++;
        const categoryId = `FR${categoryIdSequence}`;
        categoryList.push({
            idSequence: categoryIdSequence,
            parentId: '',
            categoryId,
            categoryName: category.name,
            categoryIcon: "",
        });

        //添加子分类
        for (const categoryChild of category.children) {
            categoryIdSequence++;
            categoryList.push({
                idSequence: categoryIdSequence,
                parentId: categoryId,
                categoryId: `FR${categoryIdSequence}`,
                categoryName: categoryChild.name,
                categoryIcon: "",
            });

            navIdSequence++;
            const navListData = await getCategoryNavData(categoryChild.id)

            // 遍历导航数据
            for (const navData of navListData) {
                navData.categoryId = `FR${categoryIdSequence}`
                navData.idSequence = navIdSequence
                navData.navId = `DH${navIdSequence}`
    
                navList.push(navData)
            }
            console.log(categoryChild.name, navListData.length);
            console.log('----------------------');
        }

        // console.log('categoryList', categoryList);
    }

    // 写本地json文件
    // fs.writeFileSync(path.resolve(__dirname, 'categoryData.json'), JSON.stringify(categoryList, null, 4));
    // fs.writeFileSync(path.resolve(__dirname, 'navData.json'), JSON.stringify(navList, null, 4));
    

    knex('category').insert(categoryList).then(() => {
        console.log('category insert success');
    }).catch((err) => {
        console.log('category insert error', err);
    })

    knex('nav').insert(navList).then(() => {
        console.log('nav insert success');
    }).catch((err) => {
        console.log('nav insert error', err);
    })
})()
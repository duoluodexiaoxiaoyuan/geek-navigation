'use strict';

// ========================================常用 require start===========================================
const Service = require('egg').Service;
// ========================================常用 require end=============================================
const axios = require('axios');
const cheerio = require('cheerio');

const actionDataScheme = Object.freeze({

});

class NavService extends Service {
    // 返回首页导航分类和导航的数据
    async getHomePageData(actionData) {
        const { knex, jianghuKnex } = this.ctx.app
        const { categoryId ="ai" } = actionData

        // 查分类数据，以parentId为categoryId，按sort排序，按status过滤掉0的数据
        let categoryList = await jianghuKnex('category').where({ parentId: categoryId }).orderBy('sort', 'desc').where('status', '!=', 0).select('*')
        // 查categoryId包含categoryList中categoryId的导航数据，按sort排序，按status过滤掉0的数据
        const navList = await jianghuKnex('nav').whereIn('categoryId', categoryList.map(category => category.categoryId)).orderBy('sort', 'desc').where('status', '!=', 0).select('*')


        // 遍历分类，给children加上导航数据
        categoryList.forEach((category) => {
            category.children = navList.filter(nav => nav.categoryId === category.categoryId)
        });

        // 在第一个分类前面加上一个热门推荐分类，取导航tags有热门的数据
        const hotNavList = navList.filter(nav => nav.tags && nav.tags.includes('热门'))
        if (hotNavList.length) {
            categoryList.unshift({
                categoryName: '热门推荐',
                categoryIcon: 'ico icon-icon-group-hot',
                children: hotNavList
            })
        }

        //过滤掉没有子分类的分类
        categoryList = categoryList.filter(category => category.children.length)

        return categoryList
    }

    //写一个方法，传入一个网址，返回网址的title和icon，和描述
    async getNavInfoByUrl(actionData) {
        const { url } = actionData

        try {
            // 假设这里的url可以直接返回一个包含名称、icon和描述的JSON对象，加个请求超时时间
            const response = await axios.get(url, { timeout: 5000 });


            //解析返回的html
            const html = response.data;
            const $ = cheerio.load(html);

            //提取信息
            const name = $('title').text();
            let icon = $('link[rel="icon"]').attr('href')
            // 网址提取主域名
            const domain = new URL(url).hostname;
            if (!icon) {
                icon = `${domain}/favicon.ico`;
                // icon = `https://www.google.com/s2/favicons?domain=${domain}`;
            }

            const description = $('meta[name="description"]').attr('content');


            // 返回提取的信息
            return {
                navName: name,
                navIcon: icon,
                navDesc: description,
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    //添加导航前的beforeHook，把status设为2，即待审核状态
    async addNavBeforeHook(actionData) {
        actionData.status = 2
        return actionData
    }
}

module.exports = NavService;

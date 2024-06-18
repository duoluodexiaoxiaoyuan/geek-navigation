    fs.writeFileSync(path.resolve(__dirname, 'categoryData.json'), JSON.stringify(categoryList, null, 4));
    fs.writeFileSync(path.resolve(__dirname, 'navData.json'), JSON.stringify(navList, null, 4));
    

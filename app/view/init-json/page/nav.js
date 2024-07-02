const content = {
  pageType: "jh-page", pageId: "navManagement", table: "nav", pageName: "导航管理",
  resourceList: [
    {
      actionId: "selectItemList",
      resourceType: "sql",
      resourceHook: {},
      desc: "✅查询列表-nav",
      resourceData: {
        table: "nav",
        operation: "select"
      }
    },
    {
      actionId: "insertItem",
      resourceType: "sql",
      desc: "✅添加-nav",
      resourceHook: {
        before: [
          { service: 'common', serviceFunction: 'generateBizIdOfBeforeHook'}
        ]
      },
      resourceData: {
        table: "nav",
        operation: "jhInsert"
      }
    },
    {
      actionId: "updateItem",
      resourceType: "sql",
      resourceHook: {},
      desc: "✅更新-nav",
      resourceData: {
        table: "nav",
        operation: "jhUpdate"
      }
    },
    {
      actionId: "deleteItem",
      resourceType: "sql",
      resourceHook: {},
      desc: "✅删除-nav",
      resourceData: {
        table: "nav",
        operation: "jhDelete"
      }
    }
  ], // { actionId: '', resourceType: '', resourceData: {}, resourceHook: {}, desc: '' }
  drawerList: [], // { key: '', title: '', contentList: [] }
  includeList: [
  "{% include 'component/selectFileDialog.html' %}"

  ], // { type: < js | css | html | vueComponent >, path: ''}
  common: { 
    
    data: {
      constantObj: {},
      validationRules: {
        requireRules: [
          v => !!v || '必填',
        ],
      },
      testString: '测试字符串',
      serverSearchWhereLike: { className: '' },
      categoryList: [],
    },
    dataExpression: {
      isMobile: 'window.innerWidth < 500'
    }, // data 表达式
    created() {
      this.getCategoryList()
      this.getTableData()
    },
    watch: {},
    computed: {},
    doUiAction: {
      updateNav: ['updateNav']
    },
    methods: {
      async getCategoryList() {
          const result = await window.jianghuAxios({
              data: {
                  appData: {
                      pageId: 'categoryManagement',
                      actionId: 'selectItemList',
                  }
              }
          })
          this.categoryList = result.data.appData.resultData.rows
      },
      async updateNav({id, data}) {
        await window.jianghuAxios({
            data: {
                appData: {
                    pageId: 'navManagement',
                    actionId: 'updateItem',
                    actionData: data,
                    where: {id}
                }
            }
        })
    },
    startUploadLogo(item) {
      this.$refs.selectFileDialog.doUiAction('open')
      this.currentItem = item
    },
    uploadLogo(event) {
      const {id} = this.currentItem
      const navIcon = window.appInfo.upload + event.downloadPath
      this.currentItem.navIcon = navIcon
      this.updateNav({
        id,
        data: {
          navIcon
        }
      })
    }
    },
    
  },
  headContent: [
    { tag: 'jh-page-title', value: "nav", attrs: { cols: 12, sm: 6, md:4 }, helpBtn: true, slot: [] },
    { tag: 'v-spacer' },
   
    {
      tag: 'jh-search',
      attrs: { cols: '12', sm: '6', md: '4', class: 'pa-0' },
      value: [
        { tag: 'v-text-field',  'model': 'searchInput', attrs: {prefix: '筛选'} },
        { tag: 'v-autocomplete','model': 'serverSearchWhereLike.categoryId', attrs: {prefix: '分类', ':items': 'categoryList', } },
        { tag: 'v-text-field','model': 'serverSearchWhereLike.tags', attrs: {prefix: '标签'} },
      ],
      searchBtn:true,
    },
   
  ],
  pageContent: [
    {
      tag: 'jh-table',
      attrs: { ':items-per-page':"50" },
      value: [
        { text: "导航id", value: "navId", width: 120, sortable: true },
        { text: "导航名称", value: "navName",formatter: [
          `<v-text-field v-model="item.navName" @blur="doUiAction('updateNav', {id: item.id, data: {navName: item.navName}})" class="jh-v-input" filled single-line dense></v-text-field>`
        ], width: 80, sortable: true },
        { text: "导航地址", value: "navUrl",formatter: [
          `<v-text-field v-model="item.navUrl" @blur="doUiAction('updateNav', {id: item.id, data: {navUrl: item.navUrl}})" class="jh-v-input" filled single-line dense></v-text-field>`
        ], width: 120, sortable: true },
        { text: "导航图标", value: "navIcon",formatter: [
          `<v-avatar
            class="profile"
            color="grey"
            size="35"
            @click="startUploadLogo(item)"
            tile
          >
            <v-img :src="item.navIcon"></v-img>
          </v-avatar>`
        ], width: 80, sortable: true },
        { text: "导航描述", value: "navDesc",formatter: [
          `<v-text-field v-model="item.navDesc" @blur="doUiAction('updateNav', {id: item.id, data: {navDesc: item.navDesc}})" class="jh-v-input" filled single-line dense></v-text-field>`
        ], width: 80, sortable: true },
        { text: "分类id", value: "categoryId",formatter: [
          `<v-autocomplete item-text="categoryName" item-value="categoryId" :items="categoryList" v-model="item.categoryId" @change="doUiAction('updateNav', {id: item.id, data: {categoryId: item.categoryId}})" class="jh-v-input" filled single-line dense></autocomplete>`
        ], width: 80, sortable: true },
        { text: "标签", value: "tags",formatter: [
          `<v-text-field v-model="item.tags" @blur="doUiAction('updateNav', {id: item.id, data: {tags: item.tags}})" class="jh-v-input" filled single-line dense></v-text-field>`
        ], width: 80, sortable: true },
        { text: "排序", value: "sort", width: 80, sortable: true },
        { text: "状态 0", value: "status",formatter: [
          `<v-switch v-model="item.status" :true-value="1" :false-value="0" @change="doUiAction('updateNav', {id: item.id, data: {status: item.status}})" class="jh-v-input" filled single-line dense></v-switch>`
        ], width: 80, sortable: true },
        { text: "创建时间", value: "createAt", width: 80, sortable: true },
        { text: "操作者userId", value: "operationByUserId", width: 80, sortable: true },
        { text: "操作时间", value: "operationAt", width: 80, sortable: true },
        { text: "操作", value: "action", type: "action", width: 'window.innerWidth < 500 ? 70 : 120', align: "center", class: "fixed", cellClass: "fixed" },
      ],
      showTableColumnSettingBtn: true,
      headActionList: [
        { tag: 'v-btn', value: '新增', attrs: { color: 'success', class: 'mr-2', '@click': 'doUiAction("startCreateItem")', small: true } },
        { tag: 'v-spacer' },
        // 默认筛选
       
      ],
      rowActionList: [
        { text: '编辑', icon: 'mdi-note-edit-outline', color: 'success', click: 'doUiAction("startUpdateItem", item)' }, // 简写支持 pc 和 移动端折叠
        { text: '删除', icon: 'mdi-trash-can-outline', color: 'error', click: 'doUiAction("deleteItem", item)' } // 简写支持 pc 和 移动端折叠
      ],
    },
    {
      tag: 'div',
      value: [
        `
        <select-file-dialog ref="selectFileDialog" @confirm="uploadLogo" />
        `
      ]
    }
  ],
  actionContent: [
    {
      tag: 'jh-create-drawer',
      key: "create",
      attrs: {},
      title: '新增导航',
      headSlot: [],
      contentList: [
        { 
          label: "新增", 
          type: "form", 
          formItemList: [
            { label: "导航id", model: "navId", tag: "v-text-field",idGenerate: { prefix: 'DH', bizId: 'navId', startValue: 1000 }, hidden: true   },
            { label: "导航名称", model: "navName", tag: "v-text-field", rules: "validationRules.requireRules",   },
            { label: "导航地址", model: "navUrl", tag: "v-text-field"   },
            { label: "导航图标", model: "navIcon", tag: "v-text-field"   },
            { label: "导航描述", model: "navDesc", tag: "v-text-field"   },
            { label: "分类id", model: "categoryId", tag: "v-text-field"   },
            { label: "标签", model: "tags", tag: "v-text-field"   },
            { label: "排序", model: "sort", tag: "v-text-field"   },
            { label: "状态 0", model: "status", tag: "v-text-field"   },
            { label: "创建时间", model: "createAt", tag: "v-text-field"   },
        
          ], 
          action: [{
            tag: "v-btn",
            value: "新增",
            attrs: {
              color: "success",
              ':small': true,
              '@click': "doUiAction('createItem')"
            }
          }],
        },

      ]
    },
    {
      tag: 'jh-update-drawer',
      key: "update",
      attrs: {},
      title: '编辑导航',
      headSlot: [],
      contentList: [
        { 
          label: "编辑", 
          type: "form", 
          formItemList: [
            { label: "导航名称", model: "navName", tag: "v-text-field", rules: "validationRules.requireRules",   },
            { label: "导航地址", model: "navUrl", tag: "v-text-field"   },
            { label: "导航图标", model: "navIcon", tag: "v-text-field"   },
            { label: "导航描述", model: "navDesc", tag: "v-text-field"   },
            { label: "分类id", model: "categoryId", tag: "v-text-field"   },
            { label: "标签", model: "tags", tag: "v-text-field"   },
            { label: "排序", model: "sort", tag: "v-text-field"   },
            { label: "状态 0", model: "status", tag: "v-text-field"   },
            { label: "创建时间", model: "createAt", tag: "v-text-field"   },
          ], 
          action: [{
            tag: "v-btn",
            value: "编辑",
            attrs: {
              color: "success",
              ':small': true,
              '@click': "doUiAction('updateItem')"
            }
          }],
        },
        { label: "操作记录", type: "component", componentPath: "recordHistory" },
      ]
    },
  ]
  
};

module.exports = content;

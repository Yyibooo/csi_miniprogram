Component({
  data: {
    selected: 0,
  },

  methods: {
    switchTab(e: WechatMiniprogram.TouchEvent) {
      const index = Number(e.currentTarget.dataset.index)
      const url = this.data.selected === 0 ? '/pages/mine/mine' : '/pages/index/index'
      if (index !== this.data.selected) {
        wx.switchTab({ url })
      }
    },
  },
})

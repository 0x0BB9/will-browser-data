<!-- eslint-disable style/brace-style -->
<!-- eslint-disable style/indent -->
<script setup lang="ts">
import { getFingerprint } from '@thumbmarkjs/thumbmarkjs'
import browser from 'browser-tool'
import { ElMessage } from 'element-plus'

import { onMounted, ref } from 'vue'

defineProps<{ msg: string }>()

// 定义 loading 状态和 networkInfo 数据
const loading = ref(true)
const info = ref<any>(null)
const fingerPrint = ref<any>(null)
const fingerPrint2 = ref<any>(null)

// 页面初始化时加载 networkInfo
onMounted(async () => {
  try {
    info.value = await browser.getInfo()

    // 浏览器各项综合特征指纹
    fingerPrint.value = await browser.getFingerprint()

    getFingerprint().then((fpFromTheumbmark) => { fingerPrint2.value = fpFromTheumbmark })
    // 通过 thumbmarkjs 获取浏览器指纹
  } catch (error) {
    ElMessage.error('加载网络信息失败')
    console.error(error)
  } finally {
    loading.value = false
  }
  // eslint-disable-next-line vue/block-tag-newline
})

</script>

<template>
  <div v-if="loading" class="center-container">
    加载中...
  </div>
  <div v-else class="center-container">
    <div v-if="info">
      <h2>
        浏览器详细信息
      </h2>
      <el-table :data="Object.entries(info)" border style="width: 100%">
        <el-table-column prop="0" label="Key" width="180" align="right">
          <template #default="{ row }">
            <div class="key-column" color="$ep-color-primary">
              {{ row[0] }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="1" label="Value" />
      </el-table>

      <h2>
        浏览器指纹
      </h2>
      <el-table :data="Object.entries(fingerPrint)" border style="width: 100%">
        <el-table-column prop="0" label="Key" width="180" align="right">
          <template #default="{ row }">
            <div class="key-column" color="$ep-color-primary">
              {{ row[0] }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="1" label="Value" />
      </el-table>

      <h2>
        浏览器指纹 by thumbmarkjs
      </h2>
      <div>{{ fingerPrint2 }}</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.center-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  /* 使容器占满屏幕高度 */
  text-align: center;
  padding-bottom: 60px;
}

.el-table {
  margin-top: 20px;
}

/* Key 列样式 */
.key-column {
  font-weight: bold;
  /* 字体加粗 */
}
</style>

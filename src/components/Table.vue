<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ref } from 'vue'

var browser = require("browser-tool");

defineProps<{ msg: string }>()

const tableData = [
  {
    date: '2016-05-03',
    name: 'Tom',
    address: 'No. 189, Grove St, Los Angeles',
  },
  {
    date: '2016-05-02',
    name: 'Tom',
    address: 'No. 189, Grove St, Los Angeles',
  },
  {
    date: '2016-05-04',
    name: 'Tom',
    address: 'No. 189, Grove St, Los Angeles',
  },
  {
    date: '2016-05-01',
    name: 'Tom',
    address: 'No. 189, Grove St, Los Angeles',
  },
]
</script>

<template>
  <h1 color="$ep-color-primary">
    {{ msg }}
  </h1>

  <el-table :data="tableData" border style="width: 100%">
    <el-table-column prop="name" label="Type" width="180" />
    <el-table-column prop="address" label="Value" />
  </el-table>
</template>

<style>
.ep-button {
  margin: 4px;
}
.ep-button + .ep-button {
  margin-left: 0;
  margin: 4px;
}
</style>

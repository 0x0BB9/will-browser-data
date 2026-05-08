<script lang="ts" setup>
import { toggleDark } from '~/composables'
</script>

<template>
  <el-menu class="el-menu-demo" mode="horizontal" :ellipsis="false" router>
    <el-menu-item index="/">
      <div class="brand-mark">
        <span class="brand-logo-shell">
          <img class="brand-logo" src="/favicon.svg" alt="Browser Data logo">
        </span>
        <span class="brand-title">Browser Risk Signals</span>
      </div>
    </el-menu-item>

    <el-menu-item h="full" @click="toggleDark()">
      <button
        class="w-full cursor-pointer border-none bg-transparent"
        style="height: var(--ep-menu-item-height)"
      >
        <i inline-flex i="dark:ep-moon ep-sunny" />
      </button>
    </el-menu-item>

    <el-menu-item h="full" disabled>
      <a class="size-full flex items-center justify-center" target="_blank">
        <div i-ri-github-fill />
      </a>
    </el-menu-item>
  </el-menu>
</template>

<style lang="scss">
.el-menu-demo {
  &.ep-menu--horizontal > .ep-menu-item:nth-child(1) {
    margin-right: auto;
  }
}

.brand-mark {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-logo-shell {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  overflow: hidden;
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(26, 95, 208, 0.08), rgba(26, 95, 208, 0.02));
}

.brand-logo {
  width: 54px;
  height: 34px;
  object-fit: cover;
  object-position: left center;
  display: block;
}

.brand-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #102033;
  white-space: nowrap;
}
</style>

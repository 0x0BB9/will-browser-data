<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { type BrowserSignalRecord, collectBrowserSignals } from '~/services/browserSignals'

interface SignalRow {
  key: string
  label: string
  value: string
  hint?: string
}

interface SignalGroup {
  title: string
  description: string
  rows: SignalRow[]
}

interface SummaryCard {
  label: string
  value: string
  tip: string
}

const loading = ref(true)
const info = ref<BrowserSignalRecord | null>(null)
const browserFingerprint = ref<BrowserSignalRecord | null>(null)
const thumbmarkHash = ref('')
const thumbmarkData = ref<BrowserSignalRecord | null>(null)

const removedEnvKeys = ['ip', 'battery', 'isCharging', 'deviceMemory', 'bitness'] as const
const hiddenEnvKeys = ['gpu', 'gpuModel', 'screenFPS', 'network'] as const
const excludedEnvKeys = new Set<string>([...removedEnvKeys, ...hiddenEnvKeys])

const fieldLabels: Record<string, string> = {
  browser: '浏览器',
  browserVersion: '浏览器版本',
  engine: '渲染引擎',
  isWebview: 'WebView',
  isRobot: '爬虫/机器人',
  cookieEnabled: 'Cookie 可用',
  userAgent: 'User-Agent',
  system: '操作系统',
  systemVersion: '系统版本',
  platform: '平台',
  architecture: '架构',
  device: '设备类型',
  devicePixelRatio: '设备像素比',
  isOnline: '在线状态',
  screenWidth: '屏幕宽度',
  screenHeight: '屏幕高度',
  clientWidth: '视口宽度',
  clientHeight: '视口高度',
  screenColorDepth: '颜色深度',
  screenPixelDepth: '像素深度',
  isTouch: '触控能力',
  language: '语言',
  timezone: '时区',
}

const fieldHints: Record<string, string> = {
  userAgent: '适合做兼容性与伪装识别，不建议单独当唯一身份。',
  isWebview: '适合识别 App 内嵌场景，常用于渠道与风控分层。',
  isRobot: '命中后策略价值高，但覆盖范围有限。',
  timezone: '适合与 IP 国家、语言联合做一致性校验。',
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '')
    return 'N/A'

  if (typeof value === 'boolean')
    return value ? '是' : '否'

  if (typeof value === 'number')
    return Number.isInteger(value) ? String(value) : value.toFixed(2)

  if (Array.isArray(value))
    return value.length ? value.join(', ') : '[]'

  if (typeof value === 'object')
    return JSON.stringify(value)

  return String(value)
}

function formatPreview(value: unknown, maxLength = 140) {
  const text = formatValue(value)
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

function formatFingerprintValue(key: string, value: unknown) {
  if (key === 'font')
    return `${String(value).slice(0, 16)}...`

  return formatPreview(value, 48)
}

const filteredInfo = computed<BrowserSignalRecord | null>(() => {
  if (!info.value)
    return null

  return Object.fromEntries(
    Object.entries(info.value).filter(([key]) => !excludedEnvKeys.has(key)),
  )
})

function createRows(keys: string[]) {
  const filtered = filteredInfo.value

  if (!filtered)
    return []

  return keys
    .filter(key => key in filtered)
    .map<SignalRow>(key => ({
      key,
      label: fieldLabels[key] ?? key,
      value: formatValue(filtered[key]),
      hint: fieldHints[key],
    }))
}

function prettyJson(value: unknown) {
  if (value === null || value === undefined)
    return ''

  return JSON.stringify(value, null, 2)
}

function legacyCopyText(content: string) {
  const textarea = document.createElement('textarea')
  textarea.value = content
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.top = '-9999px'
  textarea.style.left = '-9999px'

  document.body.appendChild(textarea)
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)

  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)

  return copied
}

async function copyJson(value: unknown, label: string) {
  const content = prettyJson(value)

  if (!content) {
    ElMessage.warning(`${label} 暂无可复制内容`)
    return
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(content)
    }
    else if (!legacyCopyText(content)) {
      throw new Error('Clipboard API unavailable and legacy copy failed')
    }

    ElMessage.success(`${label} 已复制`)
  }
  catch (error) {
    ElMessage.error(`${label} 复制失败`)
    console.error(error)
  }
}

const summaryCards = computed<SummaryCard[]>(() => {
  const filtered = filteredInfo.value

  if (!filtered)
    return []

  return [
    {
      label: '浏览器',
      value: [filtered.browser, filtered.browserVersion].filter(Boolean).join(' '),
      tip: '适合做兼容性、端特征和伪装识别。',
    },
    {
      label: '操作系统',
      value: [filtered.system, filtered.systemVersion].filter(Boolean).join(' '),
      tip: '和 UA、设备类型联动看一致性。',
    },
    {
      label: '设备画像',
      value: [filtered.device, filtered.platform, filtered.architecture].filter(Boolean).join(' / '),
      tip: '适合做设备聚类和异常组合识别。',
    },
    {
      label: '区域设置',
      value: [filtered.language, filtered.timezone].filter(Boolean).join(' / '),
      tip: '和 IP 地域联合看冲突最有价值。',
    },
    {
      label: '在线状态',
      value: filtered.isOnline ? '在线' : '离线',
      tip: '适合做会话级辅助判断，不建议单独拦截。',
    },
  ]
})

const signalGroups = computed<SignalGroup[]>(() => {
  return [
    {
      title: '浏览器与系统',
      description: '适合做兼容性识别、UA 伪装校验、WebView 场景标记。',
      rows: createRows(['browser', 'browserVersion', 'engine', 'system', 'systemVersion', 'platform', 'architecture', 'userAgent', 'cookieEnabled', 'isWebview', 'isRobot']),
    },
    {
      title: '设备与屏幕',
      description: '适合做设备聚类、异常终端识别、页面渲染能力判断。',
      rows: createRows(['device', 'devicePixelRatio', 'screenWidth', 'screenHeight', 'clientWidth', 'clientHeight', 'screenColorDepth', 'screenPixelDepth', 'isTouch']),
    },
    {
      title: '网络与区域',
      description: '适合做区域冲突和会话环境识别，保留当前建议入池的主字段。',
      rows: createRows(['isOnline', 'language', 'timezone']),
    },
  ].filter(group => group.rows.length > 0)
})

const browserFingerprintRows = computed<SignalRow[]>(() => {
  if (!browserFingerprint.value)
    return []

  return Object.entries(browserFingerprint.value)
    .filter(([key]) => key !== 'value')
    .map(([key, value]) => ({
      key,
      label: key.toUpperCase(),
      value: formatFingerprintValue(key, value),
      hint: key === 'audio'
        ? '波动相对更明显，更适合作为模型组件。'
        : '适合做设备指纹和相似环境聚类。',
    }))
})

const thumbmarkRows = computed<SignalRow[]>(() => {
  if (!thumbmarkData.value)
    return []

  return Object.entries(thumbmarkData.value).map(([key, value]) => ({
    key,
    label: key,
    value: formatPreview(value, 88),
    hint: '建议保留组件级数据，后续更利于策略解释和模型训练。',
  }))
})

onMounted(async () => {
  try {
    const browserSignals = await collectBrowserSignals()

    info.value = browserSignals.info
    browserFingerprint.value = browserSignals.browserFingerprint
    thumbmarkHash.value = browserSignals.thumbmarkHash
    thumbmarkData.value = browserSignals.thumbmarkData
  }
  catch (error) {
    ElMessage.error('加载浏览器环境失败')
    console.error(error)
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="workspace">
    <div v-if="loading" class="loading-shell">
      <div class="loading-card">
        <span class="eyebrow">Browser Environment Workspace</span>
        <h1>正在整理浏览器环境...</h1>
        <p>页面会按风控策略和模型视角拆分浏览器环境字段。</p>
      </div>
    </div>

    <template v-else>
      <section class="hero-card">
        <div class="hero-copy">
          <span class="eyebrow">Browser Environment Workspace</span>
          <h1>风控浏览器环境工作台</h1>
        </div>
      </section>

      <section class="summary-grid">
        <article
          v-for="card in summaryCards"
          :key="card.label"
          class="summary-card"
        >
          <span class="summary-label">{{ card.label }}</span>
          <strong class="summary-value">{{ card.value || 'N/A' }}</strong>
          <p class="summary-tip">
            {{ card.tip }}
          </p>
        </article>
      </section>

      <section class="panel-grid">
        <article
          v-for="group in signalGroups"
          :key="group.title"
          class="panel"
        >
          <header class="panel-header">
            <div>
              <h2>{{ group.title }}</h2>
              <p>{{ group.description }}</p>
            </div>
            <span class="panel-count">{{ group.rows.length }} 项</span>
          </header>

          <div class="signal-list">
            <div
              v-for="row in group.rows"
              :key="row.key"
              class="signal-row"
            >
              <div class="signal-meta">
                <span class="signal-label">{{ row.label }}</span>
                <code class="signal-key">{{ row.key }}</code>
                <p v-if="row.hint" class="signal-hint">
                  {{ row.hint }}
                </p>
              </div>
              <div class="signal-value">
                {{ row.value }}
              </div>
            </div>
          </div>
        </article>
      </section>

      <section class="fingerprint-grid">
        <article class="panel fingerprint-panel">
          <header class="panel-header">
            <div>
              <h2>browser-tool 指纹组件</h2>
              <p>偏工程化，适合快速产出环境摘要和基础指纹组件。</p>
            </div>
            <span class="panel-count">{{ browserFingerprintRows.length }} 项</span>
          </header>

          <div class="hash-box">
            <span class="hash-label">综合指纹值</span>
            <code>{{ browserFingerprint?.value || 'N/A' }}</code>
          </div>

          <div class="signal-list compact">
            <div
              v-for="row in browserFingerprintRows"
              :key="row.key"
              class="signal-row"
            >
              <div class="signal-meta">
                <span class="signal-label">{{ row.label }}</span>
                <p v-if="row.hint" class="signal-hint">
                  {{ row.hint }}
                </p>
              </div>
              <div class="signal-value mono">
                {{ row.value }}
              </div>
            </div>
          </div>
        </article>

        <article class="panel fingerprint-panel">
          <header class="panel-header">
            <div>
              <h2>thumbmarkjs 指纹组件</h2>
              <p>更偏指纹识别，建议同时保留 hash 和组件明细。</p>
            </div>
            <span class="panel-count">{{ thumbmarkRows.length }} 项</span>
          </header>

          <div class="hash-box">
            <span class="hash-label">Thumbmark Hash</span>
            <code>{{ thumbmarkHash || 'N/A' }}</code>
          </div>

          <div class="signal-list compact">
            <div
              v-for="row in thumbmarkRows"
              :key="row.key"
              class="signal-row"
            >
              <div class="signal-meta">
                <span class="signal-label">{{ row.label }}</span>
                <p v-if="row.hint" class="signal-hint">
                  {{ row.hint }}
                </p>
              </div>
              <div class="signal-value mono">
                {{ row.value }}
              </div>
            </div>
          </div>
        </article>
      </section>

      <section class="raw-grid">
        <article class="panel raw-panel">
          <header class="panel-header">
            <div>
              <h2>原始环境 JSON</h2>
              <p>方便和服务端字段映射、策略清单、埋点结构对齐。</p>
            </div>
            <el-button plain size="small" @click="copyJson(filteredInfo, '原始环境 JSON')">
              复制 JSON
            </el-button>
          </header>
          <pre>{{ prettyJson(filteredInfo) }}</pre>
        </article>

        <article class="panel raw-panel">
          <header class="panel-header">
            <div>
              <h2>指纹组件 JSON</h2>
              <p>建议保留组件级落库，便于后续重算特征和回溯分析。</p>
            </div>
            <el-button
              plain
              size="small"
              @click="copyJson({ browserTool: browserFingerprint, thumbmark: thumbmarkData }, '指纹组件 JSON')"
            >
              复制 JSON
            </el-button>
          </header>
          <pre>{{ prettyJson({ browserTool: browserFingerprint, thumbmark: thumbmarkData }) }}</pre>
        </article>
      </section>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.workspace {
  padding: 24px;
  color: #102033;
}

.loading-shell {
  min-height: calc(100vh - 120px);
  display: grid;
  place-items: center;
}

.loading-card,
.hero-card,
.panel,
.summary-card,
.insight-card {
  border: 1px solid rgba(16, 32, 51, 0.08);
  box-shadow: 0 18px 40px rgba(17, 43, 72, 0.08);
}

.loading-card,
.hero-card {
  background:
    radial-gradient(circle at top left, rgba(49, 127, 255, 0.16), transparent 36%),
    linear-gradient(135deg, #f8fbff 0%, #eef4fb 48%, #f9fcff 100%);
  border-radius: 28px;
  padding: 28px;
}

.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
}

.hero-copy {
  max-width: 760px;
}

.hero-copy h1,
.loading-card h1 {
  margin: 12px 0;
  font-size: clamp(32px, 5vw, 46px);
  line-height: 1.05;
  letter-spacing: -0.03em;
}

.loading-card p,
.panel-header p,
.summary-tip,
.signal-hint,
.insight-card p {
  margin: 0;
  color: #58697d;
  line-height: 1.6;
}

.eyebrow,
.insight-type,
.summary-label,
.hash-label,
.panel-count {
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 12px;
  font-weight: 700;
}

.eyebrow,
.insight-type,
.summary-label,
.hash-label {
  color: #1a5fd0;
}

.summary-grid,
.panel-grid,
.fingerprint-grid,
.raw-grid {
  display: grid;
  gap: 18px;
  margin-top: 20px;
}

.summary-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.panel-grid,
.insight-grid,
.raw-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.fingerprint-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.summary-card,
.panel,
.insight-card {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 24px;
  padding: 22px;
}

.summary-card {
  min-height: 148px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: linear-gradient(180deg, rgba(244, 248, 252, 0.95), rgba(255, 255, 255, 0.98)), #fff;
}

.summary-value {
  font-size: 22px;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: #102033;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.panel-header h2,
.insight-card h3 {
  margin: 0 0 8px;
  font-size: 22px;
  line-height: 1.2;
  color: #102033;
}

.panel-count {
  white-space: nowrap;
  color: #7395bc;
}

.signal-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.signal-row {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
  padding-top: 14px;
  border-top: 1px solid rgba(16, 32, 51, 0.08);
}

.signal-row:first-child {
  padding-top: 0;
  border-top: 0;
}

.signal-meta {
  min-width: 0;
}

.signal-label {
  display: block;
  font-weight: 700;
  color: #102033;
}

.signal-key {
  display: inline-block;
  margin-top: 6px;
}

.signal-hint {
  margin-top: 8px;
  font-size: 13px;
}

.signal-value {
  text-align: left;
  color: #203246;
  line-height: 1.55;
  word-break: break-word;
}

.compact .signal-value,
.mono,
pre,
code {
  font-family: 'SFMono-Regular', 'JetBrains Mono', 'Fira Code', Consolas, 'Liberation Mono', monospace;
}

.hash-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(19, 73, 160, 0.08), rgba(19, 73, 160, 0.03));
}

.hash-box code {
  font-size: 14px;
  line-height: 1.5;
  word-break: break-all;
}

.raw-panel pre {
  margin: 0;
  padding: 16px;
  border-radius: 18px;
  background: #0f1723;
  color: #dbe8ff;
  font-size: 12px;
  line-height: 1.55;
  overflow: auto;
  max-height: 480px;
}

@media (max-width: 1200px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .panel-grid,
  .fingerprint-grid,
  .raw-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .workspace {
    padding: 16px;
  }

  .hero-card {
    flex-direction: column;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .signal-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>

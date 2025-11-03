# 广告屏播放器 - 5+ App 项目

## 项目说明

这是一个基于HTML5+技术的广告屏播放器应用，专为安卓广告屏设备设计。

## 功能特性

- ✅ MQTT消息接收和文件分发
- ✅ 视频和图片播放支持
- ✅ 双video标签无缝切换
- ✅ 本地文件缓存管理
- ✅ 5+ App环境适配
- ✅ 全屏横屏显示
- ✅ 屏幕常亮
- ✅ 返回键拦截

## HBuilderX打包说明

### 1. 项目结构
```
h5player/
├── manifest.json          # 5+ App配置文件
├── index.html             # 主页面
├── css/
│   └── style.css           # 样式文件
├── js/
│   ├── main.js            # 主逻辑
│   ├── video-player.js     # 播放器核心
│   ├── mqtt-client.js      # MQTT客户端
│   ├── cache-manager.js    # 缓存管理
│   └── monitor.js          # 性能监控
├── img/
│   └── icon.png           # 应用图标(72x72)
└── unpackage/             # 打包输出目录
```

### 2. HBuilderX打包步骤

1. **打开HBuilderX**
2. **文件 → 打开目录**，选择项目根目录
3. **右键项目 → 发行 → 原生App-云打包**
4. **配置打包参数：**
   - 应用名称：广告屏播放器
   - AppID：com.example.adscreenplayer
   - 版本号：1.0.0
   - 选择Android平台
   - 勾选所需权限
5. **点击打包**

### 3. 权限配置

应用需要以下Android权限：
- 网络访问权限
- 文件读写权限
- 屏幕常亮权限
- 全屏显示权限

### 4. 环境适配说明

项目已针对5+ App环境进行适配：
- 自动检测5+环境
- 全屏横屏显示
- 屏幕常亮设置
- 返回键拦截
- 应用状态监听

### 5. 测试建议

1. **真机调试**：使用HBuilderX的真机调试功能
2. **云打包测试**：先打包测试版验证功能
3. **网络测试**：确保MQTT服务器连接正常
4. **文件下载测试**：验证文件下载和播放功能

## 技术栈

- HTML5 + CSS3 + JavaScript
- 5+ Runtime
- MQTT.js
- IndexedDB
- Video API

## 注意事项

1. 确保manifest.json配置正确
2. 提供合适的应用图标
3. 测试不同网络环境下的表现
4. 验证文件下载和播放的稳定性
# egern-widget-quota

Egern 订阅余量小组件：最多展示四个来源的剩余流量，每 1440 分钟刷新一次，不预估未知套餐。

A privacy-minded Egern widget that shows subscription traffic quotas for up to four sources.

## 这个仓库只放小组件

- `traffic-quota.widget.yaml`：Egern 模块声明、参数和任务注册。
- `traffic-quota.widget.js`：小组件脚本。

**不包含任何节点、订阅链接、证书或密码。**订阅链接只保存在使用者的 Egern 本机。

## 安装

1. 在 Egern 中安装本仓库的 `traffic-quota.widget.yaml`。
2. 组件参数填入来源名称、地区短码和订阅链接。
3. 先用 `DEMO_MODE=true` 查看样式，改回 `false` 后使用真实数据。

## 特点

- 读取 `Subscription-Userinfo` 响应头，或正文中明确标注的流量字段。
- GB / GiB 分开换算，不混用十进制与二进制单位。
- `total=0` 不视为不限量；缺少总量时显示未知，不自行推算。
- 单来源失败不影响其他来源；保留上次成功数据并标记为缓存。
- 默认 1440 分钟缓存，不重复请求订阅。
- 五套主题：冰川蓝、雾青灰、鸢尾紫、海盐蓝绿、石墨琥珀。

## 说明

需在真实 iPhone 上验证 Egern 渲染、刷新调度与订阅是否提供额度统计。
订阅是否返回用量取决于服务商接口，不能仅从节点列表推导。

## License

MIT

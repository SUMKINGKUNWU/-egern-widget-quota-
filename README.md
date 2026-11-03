# 订阅余量

Egern 订阅余量小组件：显示订阅剩余流量与今日用量，默认每 24 小时刷新一次，不预估未知套餐。

A privacy-minded Egern widget that shows a subscription's remaining traffic and today's usage.

## 安装

1. 在 Egern 中安装本仓库的 `traffic-quota.widget.yaml`。
2. 只填第一个 **订阅链接**；名称、地区码留空会自动识别。
3. 需要多个来源时，再填第二～第四个订阅链接。
4. 订阅不返回流量信息时，把 `SUBSCRIPTION_USER_AGENT` 填成 `clash.meta` 再试。
5. 想让今日用量更快出数，把 `REFRESH_HOURS` 改为 `2`（范围 0.5～24）。
6. 先用 `DEMO_MODE=true` 查看样式，改回 `false` 后使用真实数据。

名称、地区码、总量、重置日都是可选项；不填时不会编造数据。总量仅在订阅只返回剩余量时用于补足百分比。

## 特点

- 读取 `Subscription-Userinfo` 响应头，或正文中明确标注的流量字段。
- GB / GiB 分开换算，不混用十进制与二进制单位。
- `total=0` 不视为不限量；缺少总量时显示未知，不自行推算。
- 单来源失败不影响其他来源；保留上次成功数据并标记为缓存。
- 默认 24 小时缓存（`REFRESH_HOURS`），周期内不重复请求订阅。
- 参数命名与 Hark 订阅流量组件一致：`SUBn_URL`、`SUBn_NAME`、`SUBn_RESET_DAY`、`SUBn_TOTAL_GB`、`WIDGET_TITLE`、`REFRESH_HOURS`、`SUBSCRIPTION_USER_AGENT`。
- 列表样式：每个订阅各自一行，显示自己的剩余量、百分比、进度条和今日用量，不做合计。
- 五套主题：冰川蓝、雾青灰、鸢尾紫、海盐蓝绿、石墨琥珀。

## 说明

需在真实 iPhone 上验证 Egern 渲染、刷新调度与订阅是否提供额度统计。
订阅是否返回用量取决于服务商接口，不能仅从节点列表推导。

## License

MIT

-- Replace demo/English placeholder content in the partners section
-- with proper Vietnamese labels for a seafood store context.
update cms_sections
set
  subtitle = 'Đối tác vận chuyển, phương thức thanh toán và kênh kết nối',
  metadata = jsonb_set(
    metadata,
    '{groups}',
    '[
      {
        "label": "Đối tác vận chuyển",
        "items": [
          {"id": "ghn",  "label": "Giao Hàng Nhanh",      "imageUrl": null, "href": "#doi-tac"},
          {"id": "ghtk", "label": "Giao Hàng Tiết Kiệm",  "imageUrl": null, "href": "#doi-tac"},
          {"id": "ahamove", "label": "Ahamove",            "imageUrl": null, "href": "#doi-tac"}
        ]
      },
      {
        "label": "Thanh toán",
        "items": [
          {"id": "cod",     "label": "Tiền mặt / COD", "imageUrl": null, "href": "#thanh-toan"},
          {"id": "vnpay",   "label": "VNPAY",          "imageUrl": null, "href": "#thanh-toan"},
          {"id": "momo",    "label": "MoMo",           "imageUrl": null, "href": "#thanh-toan"},
          {"id": "zalopay", "label": "ZaloPay",        "imageUrl": null, "href": "#thanh-toan"}
        ]
      },
      {
        "label": "Kênh xã hội",
        "items": [
          {"id": "zalo-oa",  "label": "Zalo OA",   "imageUrl": null, "href": "#zalo"},
          {"id": "facebook", "label": "Facebook",   "imageUrl": null, "href": "#facebook"},
          {"id": "tiktok",   "label": "TikTok Shop","imageUrl": null, "href": "#tiktok"}
        ]
      },
      {
        "label": "Cam kết",
        "items": [
          {"id": "fresh-daily",  "label": "Tươi mỗi ngày",         "imageUrl": null, "href": "#cam-ket"},
          {"id": "cold-chain",   "label": "Chuỗi lạnh đạt chuẩn",  "imageUrl": null, "href": "#cam-ket"},
          {"id": "return-24h",   "label": "Đổi trả trong 24h",     "imageUrl": null, "href": "#cam-ket"}
        ]
      }
    ]'::jsonb
  )
where page_key = 'home'
  and section_key = 'partners';

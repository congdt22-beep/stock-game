export const stocks = [
  { code: "FPT", name: "FPT Corp", price: 100 },
  { code: "VNM", name: "Vinamilk", price: 75 },
  { code: "HPG", name: "Hòa Phát", price: 45 },
  { code: "MWG", name: "Mobile World", price: 90 },
  { code: "VCB", name: "Vietcombank", price: 110 },
];

export const newsList = [
  {
    headline: "Chính phủ tăng đầu tư cho chuyển đổi số",
    impact: { FPT: 5, MWG: 2, VNM: 0, HPG: -1, VCB: 1 },
  },
  {
    headline: "Giá thép thế giới giảm mạnh",
    impact: { HPG: -7, FPT: 0, VNM: 1, MWG: 0, VCB: 0 },
  },
  {
    headline: "Ngân hàng Nhà nước hạ lãi suất cơ bản",
    impact: { VCB: 4, FPT: 1, MWG: 2, VNM: 1, HPG: 1 },
  },
];

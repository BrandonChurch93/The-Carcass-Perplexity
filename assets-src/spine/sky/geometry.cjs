// Where the sky panorama lies. Degrees. The master is 120 degrees wide (az -70 to +50 about the world's +x), 13.93 px a degree, its horizon 107 px over its foot.
const MASTER_W = 1672, MASTER_H = 941, HORIZON_UP = 107;
const AZ0 = -70, AZ1 = 50;
const MASTER_PPD = MASTER_W / (AZ1 - AZ0);
const WIN_AZ = 45, WIN_EL = (45 * 941) / 1672;
const windows = [];
for (const [r, el] of [[0, -4], [1, 11]]) for (const [c, az] of [[0, -70], [1, -32.5], [2, 5]]) windows.push({ name: `r${r}c${c}`, az, el });
// What the film loads: az -70 to +50, el -4 to +44, 4096 px wide.
const OUT_W = 4096, EL0 = -4, EL1 = 44;
const OUT_PPD = OUT_W / (AZ1 - AZ0);
const OUT_H = Math.round((EL1 - EL0) * OUT_PPD);
module.exports = { MASTER_W, MASTER_H, HORIZON_UP, AZ0, AZ1, MASTER_PPD, WIN_AZ, WIN_EL, windows, OUT_W, OUT_H, EL0, EL1, OUT_PPD };

// Stream power erosion on a grid, for the land of the rise. Built by make_land.py: gcc -O2 -o out/work/gen/erode erode.c -lm
// Each pass: flood from the fixed cells (sea, the edge) so every cell drains, send every cell to its steepest lower neighbour, add up the
// area that drains through each cell, then lower each cell toward the cell it drains to by the stream power law, solved implicitly from the
// outlets upward, with a cap on the slope of any cell to the cell it drains to (the talus).
// usage: erode W H iters K dt m talus diffuse h.f32 uplift.f32 fixed.u8 out_h.f32 out_area.f32
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct { float h; int i; } Node;
static Node *heap; static int heapN;
static void push(float h, int i) {
  int k = heapN++;
  while (k > 0) { int p = (k - 1) >> 1; if (heap[p].h <= h) break; heap[k] = heap[p]; k = p; }
  heap[k].h = h; heap[k].i = i;
}
static Node pop(void) {
  Node top = heap[0]; Node last = heap[--heapN]; int k = 0;
  for (;;) { int c = 2 * k + 1; if (c >= heapN) break; if (c + 1 < heapN && heap[c + 1].h < heap[c].h) c++; if (heap[c].h >= last.h) break; heap[k] = heap[c]; k = c; }
  heap[k] = last; return top;
}
static void *load(const char *f, size_t n) { void *p = malloc(n); FILE *fp = fopen(f, "rb"); if (!fp || fread(p, 1, n, fp) != n) { fprintf(stderr, "cannot read %s\n", f); exit(1); } fclose(fp); return p; }

int main(int argc, char **argv) {
  if (argc < 14) return 1;
  int W = atoi(argv[1]), H = atoi(argv[2]), iters = atoi(argv[3]);
  float K = atof(argv[4]), dt = atof(argv[5]), m = atof(argv[6]), talus = atof(argv[7]), diffuse = atof(argv[8]);
  int N = W * H;
  float *h = load(argv[9], N * 4), *U = load(argv[10], N * 4);
  unsigned char *fixed = load(argv[11], N);
  float *hf = malloc(N * 4), *A = malloc(N * 4), *hn = malloc(N * 4);
  int *order = malloc(N * 4), *rcv = malloc(N * 4);
  unsigned char *seen = malloc(N);
  heap = malloc(sizeof(Node) * (size_t)N);
  const int dx[8] = {1, -1, 0, 0, 1, 1, -1, -1}, dy[8] = {0, 0, 1, -1, 1, -1, 1, -1};
  const float dd[8] = {1, 1, 1, 1, 1.41421f, 1.41421f, 1.41421f, 1.41421f};
  for (int y = 0; y < H; y++) for (int x = 0; x < W; x++) if (x == 0 || y == 0 || x == W - 1 || y == H - 1) fixed[y * W + x] = 1;
  for (int it = 0; it < iters; it++) {
    memset(seen, 0, N); heapN = 0; int n = 0;
    for (int i = 0; i < N; i++) if (fixed[i]) { seen[i] = 1; hf[i] = h[i]; push(h[i], i); }
    while (heapN > 0) {
      Node c = pop(); order[n++] = c.i; int cx = c.i % W, cy = c.i / W;
      for (int k = 0; k < 8; k++) {
        int x = cx + dx[k], y = cy + dy[k]; if (x < 0 || y < 0 || x >= W || y >= H) continue;
        int j = y * W + x; if (seen[j]) continue; seen[j] = 1;
        float v = h[j]; float low = c.h + 1e-5f; if (v < low) v = low; hf[j] = v; push(v, j);
      }
    }
    for (int i = 0; i < N; i++) {
      A[i] = 1; rcv[i] = i; if (fixed[i]) continue;
      int cx = i % W, cy = i / W; float best = 0;
      for (int k = 0; k < 8; k++) {
        int x = cx + dx[k], y = cy + dy[k]; if (x < 0 || y < 0 || x >= W || y >= H) continue;
        int j = y * W + x; float s = (hf[i] - hf[j]) / dd[k]; if (s > best) { best = s; rcv[i] = j; }
      }
    }
    for (int k = N - 1; k >= 0; k--) { int i = order[k]; if (rcv[i] != i) A[rcv[i]] += A[i]; }
    for (int k = 0; k < N; k++) {
      int i = order[k]; if (fixed[i] || rcv[i] == i) { hn[i] = h[i]; continue; }
      int j = rcv[i]; int ax = abs(i % W - j % W) + abs(i / W - j / W); float d = ax == 2 ? 1.41421f : 1.0f;
      float c = K * dt * powf(A[i], m) / d;
      float v = (h[i] + U[i] * dt + c * hn[j]) / (1 + c);
      if (v < hn[j] + 1e-6f) v = hn[j] + 1e-6f;
      float cap = hn[j] + talus * d; if (v > cap) v = cap;
      hn[i] = v;
    }
    if (diffuse > 0) {
      for (int y = 1; y < H - 1; y++) for (int x = 1; x < W - 1; x++) {
        int i = y * W + x; if (fixed[i]) { h[i] = hn[i]; continue; }
        float lap = hn[i - 1] + hn[i + 1] + hn[i - W] + hn[i + W] - 4 * hn[i];
        h[i] = hn[i] + diffuse * lap;
      }
    } else memcpy(h, hn, N * 4);
  }
  FILE *fp = fopen(argv[12], "wb"); fwrite(h, 4, N, fp); fclose(fp);
  fp = fopen(argv[13], "wb"); fwrite(A, 4, N, fp); fclose(fp);
  return 0;
}

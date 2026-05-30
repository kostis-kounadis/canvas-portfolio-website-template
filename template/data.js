// Data source for images and videos.
// This is the single place the "folder contents" are described for the front-end.
//
// Important: main.js reads from window.mediaItems, so we attach it to window
// (like publishing your asset library so the layout engine can "see" it).
//
// thumb: low-res version used for LoD rendering at zoom < 0.5.
// Until the build script (Step 7) generates real 200px thumbs,
// thumb === src (no-op swap, zero performance cost).

window.mediaItems = [
  {
    "id": "expe-experiments-landscape-1",
    "type": "image",
    "src": "assets/images/experiments/experiments-landscape-1.png",
    "width": 520,
    "height": 325,
    "group": "experiments"
  },
  {
    "id": "expe-experiments-landscape-4",
    "type": "image",
    "src": "assets/images/experiments/experiments-landscape-4.png",
    "width": 520,
    "height": 325,
    "group": "experiments"
  },
  {
    "id": "expe-experiments-portrait-2",
    "type": "image",
    "src": "assets/images/experiments/experiments-portrait-2.png",
    "width": 520,
    "height": 780,
    "group": "experiments"
  },
  {
    "id": "expe-experiments-portrait-5",
    "type": "image",
    "src": "assets/images/experiments/experiments-portrait-5.png",
    "width": 520,
    "height": 780,
    "group": "experiments"
  },
  {
    "id": "expe-experiments-square-3",
    "type": "image",
    "src": "assets/images/experiments/experiments-square-3.png",
    "width": 520,
    "height": 520,
    "group": "experiments"
  },
  {
    "id": "expe-experiments-square-6",
    "type": "image",
    "src": "assets/images/experiments/experiments-square-6.png",
    "width": 520,
    "height": 520,
    "group": "experiments"
  },
  {
    "id": "pers-personal-landscape-1",
    "type": "image",
    "src": "assets/images/personal/personal-landscape-1.png",
    "width": 520,
    "height": 325,
    "group": "personal"
  },
  {
    "id": "pers-personal-landscape-4",
    "type": "image",
    "src": "assets/images/personal/personal-landscape-4.png",
    "width": 520,
    "height": 325,
    "group": "personal"
  },
  {
    "id": "pers-personal-portrait-2",
    "type": "image",
    "src": "assets/images/personal/personal-portrait-2.png",
    "width": 520,
    "height": 780,
    "group": "personal"
  },
  {
    "id": "pers-personal-portrait-5",
    "type": "image",
    "src": "assets/images/personal/personal-portrait-5.png",
    "width": 520,
    "height": 780,
    "group": "personal"
  },
  {
    "id": "pers-personal-square-3",
    "type": "image",
    "src": "assets/images/personal/personal-square-3.png",
    "width": 520,
    "height": 520,
    "group": "personal"
  },
  {
    "id": "pers-personal-square-6",
    "type": "image",
    "src": "assets/images/personal/personal-square-6.png",
    "width": 520,
    "height": 520,
    "group": "personal"
  },
  {
    "id": "work-work-landscape-1",
    "type": "image",
    "src": "assets/images/work/work-landscape-1.png",
    "width": 520,
    "height": 325,
    "group": "work"
  },
  {
    "id": "work-work-landscape-4",
    "type": "image",
    "src": "assets/images/work/work-landscape-4.png",
    "width": 520,
    "height": 325,
    "group": "work"
  },
  {
    "id": "work-work-portrait-2",
    "type": "image",
    "src": "assets/images/work/work-portrait-2.png",
    "width": 520,
    "height": 780,
    "group": "work"
  },
  {
    "id": "work-work-portrait-5",
    "type": "image",
    "src": "assets/images/work/work-portrait-5.png",
    "width": 520,
    "height": 780,
    "group": "work"
  },
  {
    "id": "work-work-square-3",
    "type": "image",
    "src": "assets/images/work/work-square-3.png",
    "width": 520,
    "height": 520,
    "group": "work"
  },
  {
    "id": "work-work-square-6",
    "type": "image",
    "src": "assets/images/work/work-square-6.png",
    "width": 520,
    "height": 520,
    "group": "work"
  }
];

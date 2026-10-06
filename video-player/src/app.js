import { BasePage } from './base-page.js';

// 设计宽度 800（与 PenBili 一致，Falcon 自动缩放到 320x240 物理屏幕）
const DESIGN_WIDTH = 800;

class App extends $falcon.App {
  constructor() {
    super();
  }

  onLaunch(options) {
    super.onLaunch(options);
    this.setViewPort(DESIGN_WIDTH);
    $falcon.useDefaultBasePageClass(BasePage);
  }

  onShow() {
    super.onShow();
  }

  onHide() {
    super.onHide();
  }

  onDestroy() {
    super.onDestroy();
  }
}

export default App;

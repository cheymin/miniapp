const apps = [
  { name: 'AI', color: '#5b5bd6', icon: '/icons/ai.png' },
  { name: '图库', color: '#0f9d7a', icon: '/icons/image.png' },
  { name: '文件', color: '#c99a2e', icon: '/icons/file.png' },
  { name: '视频', color: '#d6467f', icon: '/icons/video.png' },
  { name: '终端', color: '#12603e', glyph: '>_' },
  { name: '更新', color: '#1f7ad4', icon: '/icons/update.png' },
  { name: '设置', color: '#c4663f', icon: '/icons/settings.png' },
  { name: '锁屏', color: '#5b2436', glyph: '锁' },
];

export function DeviceMock() {
  return (
    <div className="device" aria-label="Cheymin Pen 桌面预览">
      <div className="float-chip float-a">
        <b>15 fps</b> 平滑播放
      </div>
      <div className="float-chip float-b">
        <b>本地拼音</b> 自绘键盘
      </div>
      <div className="device-screen">
        <div className="device-head">
          <span className="device-time">21:48</span>
          <span className="device-date">11 月 22 日 周六</span>
          <span className="device-brandline">CHEYMIN PEN</span>
        </div>
        <div className="device-apps">
          {apps.map((app) => (
            <div className="device-app" key={app.name}>
              <span className="device-icon" style={{ background: app.color }}>
                {app.icon ? <img src={app.icon} alt="" width={15} height={15} /> : app.glyph}
              </span>
              <span>{app.name}</span>
            </div>
          ))}
        </div>
        <div className="device-dots">
          <i />
          <i className="on" />
        </div>
      </div>
    </div>
  );
}

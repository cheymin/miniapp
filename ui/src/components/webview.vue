<script>
export default {
  name: 'HtmlView',
  props: {
    url: { type: String, required: true },
    debug: { type: Boolean, default: false }
  },
  data() {
    return {
      nodeTree: null,
      rawHtml: '',
      loading: false,
      error: false,
      errorMsg: '',
      currentUrl: this.url,
      cssRules: []
    }
  },
  watch: { url(val) { this.currentUrl = val; this.loadHtml() } },
  created() { this.loadHtml() },
  methods: {
    _startsWith(str, prefix) {
      if (typeof str !== 'string') return false
      return str.indexOf(prefix) === 0
    },
    _replaceHttps(url) {
      return url.replace('https://', 'http://')
    },
    resolveUrl(src, base) {
      if (!src || !base) return src
      if (this._startsWith(src, 'http://') || this._startsWith(src, 'https://') || this._startsWith(src, '//')) return src
      let baseUrl = base
      const queryIdx = baseUrl.indexOf('?')
      if (queryIdx !== -1) baseUrl = baseUrl.substring(0, queryIdx)
      const hashIdx = baseUrl.indexOf('#')
      if (hashIdx !== -1) baseUrl = baseUrl.substring(0, hashIdx)
      if (this._startsWith(src, '/')) {
        const domainEnd = baseUrl.indexOf('/', 8)
        if (domainEnd === -1) return baseUrl + src
        return baseUrl.substring(0, domainEnd) + src
      } else {
        let dir = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1)
        if (dir === '') dir = baseUrl + '/'
        return dir + src
      }
    },

    async loadHtml() {
      this.loading = true; this.error = false;
      try {
        const http = $falcon.jsapi.http;
        let reqUrl = this.currentUrl;
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9'
        };

        let html = '';
        let resp = await this._doRequest(http, reqUrl, headers);
        html = this._extractHtml(resp);
        if (!html && this._startsWith(reqUrl, 'https://')) {
          reqUrl = this._replaceHttps(reqUrl);
          resp = await this._doRequest(http, reqUrl, headers);
          html = this._extractHtml(resp);
        }

        if (!html || !html.length) throw new Error('Empty response');
        this.rawHtml = html;

        const result = this.parseHTML(html);
        this.nodeTree = result.nodeTree;
        this.cssRules = result.cssRules || [];

        if (!this.nodeTree || !this.nodeTree.length) throw new Error('No content');
      } catch (e) {
        console.error('[HtmlView] load error:', e.message);
        this.error = true; this.errorMsg = e.message;
      } finally { this.loading = false; }
    },

    async _doRequest(http, url, headers) {
      try { return await http.request({ url, method: 'GET', header: headers }); } catch (e) { return null; }
    },
    _extractHtml(resp) {
      if (!resp) return '';
      if (typeof resp === 'string') return resp;
      if (resp.result) return resp.result;
      if (resp.data) return resp.data;
      if (resp.body) return resp.body;
      return '';
    },

    parseHTML(html) {
      const selfClosing = ['br','img','hr','input','link','meta','area','base','col','embed','source','track','wbr'];
      const stack = [{ tag: 'root', children: [] }];
      const cssRules = [];
      let i = 0;
      const push = (n) => stack[stack.length-1].children.push(n);

      while (i < html.length) {
        if (html[i] === '<') {
          if (this._startsWith(html.substring(i).toLowerCase(), '<!doctype') || this._startsWith(html.substring(i), '<!--')) {
            const end = html.indexOf('>', i); i = end !== -1 ? end+1 : i+1; continue;
          }
          if (html[i+1] === '/') {
            const m = html.substring(i).match(/^<\/(\w+)\s*>/);
            if (m) {
              const tag = m[1].toLowerCase(); i += m[0].length;
              for (let j = stack.length-1; j >= 0; j--) {
                if (stack[j].tag === tag) { stack.length = j; break; }
              }
              continue;
            }
          }
          const m = html.substring(i).match(/^<(\w+)([^>]*?)(\/?)>/);
          if (!m) { i++; continue; }
          const [full, tag, attrsStr, selfClose] = m;
          const tagName = tag.toLowerCase(); i += full.length;

          if (tagName === 'style') {
            const closeIdx = html.indexOf('</style>', i);
            if (closeIdx !== -1) {
              this.parseCSSText(html.substring(i, closeIdx), cssRules);
              i = closeIdx + 8;
            }
            continue;
          }
          if (tagName === 'script' || tagName === 'link' || tagName === 'meta' || tagName === 'head' || tagName === 'title') {
            if (tagName === 'script') {
              const closeIdx = html.indexOf('</script>', i);
              if (closeIdx !== -1) i = closeIdx + 9;
            }
            continue;
          }

          const node = {
            tag: tagName,
            attrs: this.parseAttrs(attrsStr || ''),
            styles: this.parseStyle(attrsStr || ''),
            children: []
          };
          if (selfClosing.includes(tagName) || selfClose === '/') push(node);
          else { push(node); stack.push(node); }
        } else {
          const end = html.indexOf('<', i);
          const text = html.substring(i, end === -1 ? html.length : end);
          i = end === -1 ? html.length : end;
          const trimmed = text.replace(/\s+/g, ' ').trim();
          if (trimmed) push({ type:'text', text:trimmed, styles:{} });
        }
      }

      const body = stack[0].children.find(n => n.tag === 'body');
      return { nodeTree: body ? body.children : stack[0].children, cssRules };
    },

    parseCSSText(cssText, rules) {
      cssText = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
      const blocks = cssText.split('}');
      blocks.forEach(block => {
        const sep = block.indexOf('{');
        if (sep === -1) return;
        const selStr = block.substring(0, sep).trim();
        const declStr = block.substring(sep+1).trim();
        if (!selStr || !declStr) return;
        const decls = {};
        declStr.split(';').forEach(dec => {
          const col = dec.indexOf(':');
          if (col === -1) return;
          const prop = dec.substring(0, col).trim();
          const val = dec.substring(col+1).trim();
          if (prop && val) {
            const camel = prop.replace(/-([a-z])/g, (_,c)=>c.toUpperCase());
            decls[camel] = val;
          }
        });
        const selectors = selStr.split(',').map(s => s.trim());
        selectors.forEach(sel => {
          if (!sel) return;
          const parts = sel.split(/\s+/);
          const last = parts[parts.length-1];
          if (last && !last.includes(':') && !last.includes('[')) {
            rules.push({ selector: last, declarations: { ...decls } });
          }
        });
      });
    },

    parseAttrs(str) {
      const attrs = {};
      const re = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
      let m;
      while ((m=re.exec(str))) attrs[m[1]] = m[2]||m[3]||m[4];
      return attrs;
    },
    parseStyle(str) {
      const m = str.match(/style\s*=\s*(?:"([^"]*)"|'([^']*)')/);
      if (!m) return {};
      const s = (m[1]||m[2]||'').trim();
      if (!s) return {};
      const obj = {};
      s.split(';').forEach(r => {
        const [k,v] = r.split(':').map(x=>x.trim());
        if (k&&v) obj[k.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())] = v;
      });
      return obj;
    },

    onLinkClick(href) {
      if (!href || this._startsWith(href, 'javascript:')) return;
      if (this._startsWith(href, '//')) href = 'http:' + href;
      if (!this._startsWith(href, 'http')) {
        href = this.resolveUrl(href, this.currentUrl);
      }
      this.currentUrl = href;
      this.loadHtml();
      this.$emit('navigate', href);
    },

    matchCSSRules(node) {
      const matched = {};
      if (!node || node.type === 'text') return matched;
      const tag = node.tag || '';
      const attrs = node.attrs || {};
      const classes = attrs.class ? attrs.class.split(/\s+/) : [];
      const id = attrs.id || '';
      this.cssRules.forEach(rule => {
        let match = false;
        if (this._startsWith(rule.selector, '#')) match = id === rule.selector.slice(1);
        else if (this._startsWith(rule.selector, '.')) match = classes.includes(rule.selector.slice(1));
        else match = rule.selector.toLowerCase() === tag.toLowerCase();
        if (match) Object.assign(matched, rule.declarations);
      });
      return matched;
    },

    renderNode(node, h) {
      if (!node) return null;
      if (node.type === 'text') {
        return h('text', { style: { fontSize:'12px', color:'#333', lineHeight:'16px' } }, node.text);
      }

      if (node.tag === 'br') return h('div', { style: { height:'8px' } });

      if (node.tag === 'img') {
        let src = (node.attrs && node.attrs.src) ? node.attrs.src : '';
        if (this._startsWith(src, '//')) src = 'http:' + src;
        else if (this._startsWith(src, 'https://')) src = this._replaceHttps(src);
        else if (!this._startsWith(src, 'http')) src = this.resolveUrl(src, this.currentUrl);
        return h('image', { attrs:{ src }, style:{ width:'280px', height:'150px' } });
      }

      if (node.tag === 'input') {
        const attrs = node.attrs || {};
        const type = (attrs.type || 'text').toLowerCase();
        if (type === 'submit' || type === 'button') {
          return h('div', {
            style: { padding:'6px 12px', backgroundColor:'#1677ff', borderRadius:'4px', margin:'4px 0' },
            on: { click: () => {} }
          }, [h('text', { style:{ color:'#fff', fontSize:'12px' } }, attrs.value || type)]);
        }
        return h('input', {
          attrs: { type:'text', value: attrs.value || '', placeholder: attrs.placeholder || '' },
          style: { borderWidth:'1px', borderColor:'#ddd', borderRadius:'4px', padding:'4px 6px', fontSize:'12px', margin:'2px 0', width:'260px' }
        });
      }

      const tagStyles = {
        h1: { fontSize:'16px', fontWeight:'bold', margin:'8px 0 4px 0', color:'#000' },
        h2: { fontSize:'15px', fontWeight:'bold', margin:'6px 0 3px 0', color:'#000' },
        h3: { fontSize:'14px', fontWeight:'bold', margin:'5px 0 3px 0', color:'#000' },
        h4: { fontSize:'13px', fontWeight:'bold', margin:'4px 0 2px 0', color:'#000' },
        p: { margin:'0 0 6px 0', color:'#333', lineHeight:'16px' },
        div: { margin:'0 0 2px 0' },
        li: { margin:'0 0 2px 0', paddingLeft:'8px', color:'#333' },
        a: { color:'#1677ff', textDecoration:'underline' },
        span: { color:'#333' },
        strong: { fontWeight:'bold', color:'#000' },
        b: { fontWeight:'bold', color:'#000' },
        pre: { fontFamily:'monospace', margin:'4px 0', padding:'6px', backgroundColor:'#f5f5f5', fontSize:'11px' },
        code: { fontFamily:'monospace', backgroundColor:'#f0f0f0', padding:'1px 3px', fontSize:'11px' },
        blockquote: { borderLeftWidth:'3px', borderLeftColor:'#ccc', paddingLeft:'8px', margin:'4px 0', color:'#666' }
      };

      const cssMatched = this.matchCSSRules(node);
      const inline = node.styles || {};
      const baseStyle = tagStyles[node.tag] || { color:'#333' };
      const style = { ...baseStyle, ...cssMatched, ...inline, fontSize: (cssMatched.fontSize || inline.fontSize || baseStyle.fontSize || '12px') };

      const children = (node.children||[]).map(c => this.renderNode(c, h));

      if (node.tag === 'a' && node.attrs && node.attrs.href) {
        return h('text', {
          style: { ...style, color:'#1677ff' },
          on: { click: () => this.onLinkClick(node.attrs.href) }
        }, this.getInnerText(node));
      }

      if (['span', 'strong', 'b', 'em', 'i', 'u', 'code', 'small'].includes(node.tag)) {
        return h('text', { style }, children.length ? children : [this.getInnerText(node)]);
      }

      if (['ul', 'ol'].includes(node.tag)) {
        return h('div', { style: { flexDirection:'column', margin:'4px 0', paddingLeft:'12px' } }, children);
      }

      return h('div', { style: { flexDirection:'column', ...style } }, children);
    },

    getInnerText(node) {
      if (!node) return '';
      if (node.type === 'text') return node.text;
      if (node.children) return node.children.map(c => this.getInnerText(c)).join('');
      return '';
    }
  },

  render(h) {
    if (this.loading) {
      return h('div', { style:{ flex:1, justifyContent:'center', alignItems:'center' } }, [
        h('text', { style:{ color:'#666', fontSize:'14px' } }, '加载中...')
      ]);
    }
    if (this.error || !this.nodeTree) {
      return h('div', { style:{ flex:1, justifyContent:'center', alignItems:'center', padding:'10px' } }, [
        h('text', { style:{ color:'#ff4d4f', fontSize:'12px', textAlign:'center' } }, '加载失败: ' + this.errorMsg)
      ]);
    }
    return h('scroller', {
      style: { flex:1, backgroundColor:'#fff' },
      attrs: { 'scroll-direction':'vertical', 'show-scrollbar':true }
    }, [
      h('div', {
        style: { flexDirection:'column', padding:'6px' }
      }, (this.nodeTree || []).map(n => this.renderNode(n, h)))
    ]);
  }
}
</script>

<style scoped>
</style>

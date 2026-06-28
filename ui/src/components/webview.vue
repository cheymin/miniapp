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
      baseUrl: '',
      currentUrl: this.url,
      cssRules: [],
      scripts: [],
      externalCssLoaded: 0,
      externalCssFailed: 0
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
    buildQuery(params) {
      return Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&')
    },

    async loadHtml() {
      this.loading = true; this.error = false;
      try {
        const http = $falcon.jsapi.http;
        let reqUrl = this.currentUrl;
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6'
        };

        let html = '';
        let resp = await this._doRequest(http, reqUrl, headers);
        html = this._extractHtml(resp);
        if (!html && this._startsWith(reqUrl, 'https://')) {
          reqUrl = this._replaceHttps(reqUrl);
          resp = await this._doRequest(http, reqUrl, headers);
          html = this._extractHtml(resp);
        }

        if (!html || !html.length) throw new Error('Empty or redirect');
        this.rawHtml = html;
        if (this.debug) console.log('[HtmlView] HTML prefix:', html.substring(0, 500));

        this.baseUrl = this.currentUrl;
        const result = this.parseHTML(html);
        this.nodeTree = result.nodeTree;
        this.cssRules = result.cssRules || [];
        this.scripts = result.scripts || [];
        const externalCSS = result.externalCSS || [];

        this.externalCssLoaded = 0;
        this.externalCssFailed = 0;
        if (externalCSS.length > 0) {
          for (let i = 0; i < externalCSS.length; i++) {
            const href = externalCSS[i];
            if (!href || typeof href !== 'string') continue;
            let url = href;
            if (this._startsWith(url, '//')) url = 'http:' + url;
            else if (!this._startsWith(url, 'http')) url = this.resolveUrl(url, this.currentUrl);
            if (this._startsWith(url, 'https://')) url = this._replaceHttps(url);
            try {
              const cssResp = await http.request({ url, method: 'GET' });
              let cssText = '';
              if (typeof cssResp === 'string') cssText = cssResp;
              else if (cssResp && cssResp.result) cssText = cssResp.result;
              else if (cssResp && cssResp.data) cssText = cssResp.data;
              else if (cssResp && cssResp.body) cssText = cssResp.body;
              if (cssText) {
                this.parseCSSText(cssText, this.cssRules);
                this.externalCssLoaded++;
              }
            } catch (e) {
              this.externalCssFailed++;
            }
          }
        }

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
      const externalCSS = [];
      const scripts = [];
      let i = 0;
      const push = (n) => stack[stack.length-1].children.push(n);

      while (i < html.length) {
        if (html[i] === '<') {
          if (this._startsWith(html.substring(i), '<!doctype')) {
            const end = html.indexOf('>', i); i = end !== -1 ? end+1 : i+1; continue;
          }
          if (this._startsWith(html.substring(i), '<!--')) {
            const end = html.indexOf('-->', i); i = end !== -1 ? end+3 : i+1; continue;
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
          if (tagName === 'script') {
            const re = /<\/script\s*>/i;
            const closeMatch = html.substring(i).match(re);
            if (closeMatch) {
              scripts.push(html.substring(i, i + closeMatch.index));
              i += closeMatch.index + closeMatch[0].length;
            }
            continue;
          }
          if (tagName === 'link') {
            if (attrsStr && typeof attrsStr === 'string') {
              const attrs = this.parseAttrs(attrsStr);
              if (attrs && attrs.rel && typeof attrs.rel === 'string' && attrs.rel.toLowerCase() === 'stylesheet' && attrs.href) {
                externalCSS.push(attrs.href);
              }
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
          const trimmed = text.trim();
          if (trimmed) push({ type:'text', text:trimmed, styles:{} });
        }
      }

      const body = stack[0].children.find(n => n.tag === 'body');
      if (body) {
        return { nodeTree: body.children, cssRules, externalCSS, scripts };
      } else {
        const headTags = ['title','meta','link','style','script','base','head'];
        const filtered = stack[0].children.filter(n => !headTags.includes(n.tag));
        return { nodeTree: filtered, cssRules, externalCSS, scripts };
      }
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
        const safeDecls = this.filterCSSDeclarations(decls);
        if (!Object.keys(safeDecls).length) return;
        const selectors = selStr.split(',').map(s => s.trim());
        selectors.forEach(sel => {
          if (!sel) return;
          const parts = sel.split(/\s+/);
          const last = parts[parts.length-1];
          if (last && !last.includes(':')) {
            rules.push({ selector: last, declarations: { ...safeDecls } });
          }
        });
      });
    },

    filterCSSDeclarations(decls) {
      const forbidden = [
        'visibility','opacity','zIndex',
        'position','float','clear','overflow',
        'top','right','bottom','left',
        'transform','transition','animation'
      ];
      const safe = {};
      for (let key in decls) {
        if (!forbidden.includes(key)) {
          if (key === 'display') {
            const val = decls[key];
            if (val === 'inline' || val === 'inline-block' || val === 'inline-flex') {
              safe.display = val;
            }
            continue;
          }
          if (key === 'position' && decls[key] === 'relative') {
            safe.position = 'relative';
            continue;
          }
          safe[key] = decls[key];
        }
      }
      return safe;
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
    },
    onFormSubmit(formNode) {
      const action = (formNode.attrs && formNode.attrs.action) ? formNode.attrs.action : '';
      const method = (formNode.attrs && formNode.attrs.method) ? formNode.attrs.method.toLowerCase() : 'get';
      const inputs = [];
      const collectInputs = (node) => {
        if (node.tag === 'input' || node.tag === 'textarea' || node.tag === 'select') {
          if (node.attrs && node.attrs.name) {
            inputs.push({ name: node.attrs.name, value: node.attrs.value || '' });
          }
        }
        if (node.children) node.children.forEach(collectInputs);
      };
      collectInputs(formNode);
      let url = action;
      if (!url) url = this.currentUrl;
      if (this._startsWith(url, '//')) url = 'http:' + url;
      else if (!this._startsWith(url, 'http')) url = this.resolveUrl(url, this.currentUrl);
      if (method === 'get') {
        const query = this.buildQuery(inputs.reduce((acc, cur) => { acc[cur.name] = cur.value; return acc; }, {}));
        if (query) url += (url.indexOf('?') === -1 ? '?' : '&') + query;
      }
      this.currentUrl = url;
      this.loadHtml();
    },

    matchCSSRules(node) {
      const matched = {};
      if (!node || node.type === 'text') return matched;
      const tag = node.tag || '';
      const attrs = node.attrs || {};
      const classes = attrs.class ? attrs.class.split(/\s+/) : [];
      const id = attrs.id || '';
      this.cssRules.forEach(rule => {
        if (this.simpleSelectorMatch(rule.selector, tag, classes, id)) {
          Object.assign(matched, rule.declarations);
        }
      });
      return matched;
    },
    simpleSelectorMatch(sel, tag, classes, id) {
      if (this._startsWith(sel, '#')) return id === sel.slice(1);
      if (this._startsWith(sel, '.')) return classes.includes(sel.slice(1));
      return sel.toLowerCase() === tag.toLowerCase();
    },

    renderNode(node, h, parentForm) {
      if (!node) return null;
      if (node.type === 'text') {
        const style = this.getCombinedStyle({ tag:'span', styles:node.styles||{}, attrs:{} });
        if (style.backgroundColor && style.backgroundColor !== 'transparent') {
          return h('div', { style: { backgroundColor: style.backgroundColor } }, [
            h('text', { style: this.inlineStyle(style) }, node.text)
          ]);
        }
        return h('text', { style: this.inlineStyle(style) }, node.text);
      }

      if (node.tag === 'br') return h('div', { style: { height: '20px' } });

      if (node.tag === 'input') {
        const attrs = node.attrs || {};
        const style = this.getCombinedStyle(node);
        const type = (attrs.type || 'text').toLowerCase();
        if (type === 'submit' || type === 'button' || type === 'reset') {
          const text = attrs.value || type;
          return h('div', {
            style: {
              ...this.inlineStyle(style),
              padding: '8px 16px',
              backgroundColor: '#ddd',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: '4px',
              margin: '4px 0'
            },
            on: { click: () => { if (parentForm) this.onFormSubmit(parentForm); } }
          }, [h('text', { style: { color: '#000' } }, text)]);
        }
        return h('input', {
          attrs: { type: type, value: attrs.value || '', placeholder: attrs.placeholder || '' },
          style: this.inlineStyle(style)
        });
      }
      if (node.tag === 'textarea') {
        const attrs = node.attrs || {};
        const style = this.getCombinedStyle(node);
        return h('textarea', { attrs: { value: attrs.value || '' }, style: this.inlineStyle(style) });
      }
      if (node.tag === 'button') {
        const style = this.getCombinedStyle(node);
        const children = (node.children||[]).map(c => this.renderNode(c, h, parentForm));
        return h('div', {
          style: { ...this.inlineStyle(style), padding:'8px 16px', backgroundColor:'#ddd', justifyContent:'center', alignItems:'center', borderRadius:'4px' },
          on: { click: () => { if (parentForm) this.onFormSubmit(parentForm); } }
        }, children);
      }
      if (node.tag === 'select') {
        const text = this.getInnerText(node) || '(select)';
        const style = this.getCombinedStyle(node);
        return h('text', { style: this.inlineStyle(style) }, text);
      }

      if (node.tag === 'img') {
        const style = node.styles || {};
        const width = style.width || '100px';
        const height = style.height || '100px';
        let src = (node.attrs && node.attrs.src) ? node.attrs.src : '';
        if (this._startsWith(src, '//')) src = 'http:' + src;
        else if (this._startsWith(src, 'https://')) src = this._replaceHttps(src);
        else if (!this._startsWith(src, 'http')) src = this.resolveUrl(src, this.currentUrl);
        return h('image', { attrs:{ src }, style:{ width, height } });
      }

      const inlineTags = ['span','a','strong','b','em','i','u','font','code','sub','sup','label','small',
                           'abbr','acronym','bdi','bdo','cite','del','dfn','ins','kbd','mark','q','s','samp','var'];
      const combinedStyle = this.getCombinedStyle(node);
      if (!['img','input','textarea'].includes(node.tag)) {
        delete combinedStyle.height;
      }

      if (node.tag === 'table') {
        const children = (node.children||[]).map(c => this.renderNode(c, h, parentForm));
        return h('div', { style: { flexDirection:'column', border:'1px solid #ccc', ...this.inlineStyle(combinedStyle) } }, children);
      }
      if (node.tag === 'tr') {
        const children = (node.children||[]).map(c => this.renderNode(c, h, parentForm));
        return h('div', { style: { flexDirection:'row', borderBottom:'1px solid #ccc', ...this.inlineStyle(combinedStyle) } }, children);
      }
      if (node.tag === 'td' || node.tag === 'th') {
        const cellStyle = { padding:'4px 8px', border:'1px solid #ccc', flex:1, ...this.inlineStyle(combinedStyle) };
        const children = (node.children||[]).map(c => this.renderNode(c, h, parentForm));
        return h('div', { style: cellStyle }, children);
      }

      if (node.tag === 'form') {
        const children = (node.children||[]).map(c => this.renderNode(c, h, node));
        const containerStyle = this.inlineStyle(combinedStyle);
        containerStyle.flexDirection = 'column';
        return h('div', { style: containerStyle }, children);
      }

      if (inlineTags.includes(node.tag)) {
        if (this.hasImageOrBlock(node)) {
          const children = (node.children||[]).map(c => this.renderNode(c, h, parentForm));
          const container = h('div', { style: this.inlineStyle(combinedStyle) }, children);
          if (node.tag === 'a' && node.attrs && node.attrs.href) {
            return h('div', { on: { click: () => this.onLinkClick(node.attrs.href) } }, [container]);
          }
          return container;
        }
        const text = this.getInnerText(node);
        if (node.tag === 'a' && node.attrs && node.attrs.href) {
          return h('text', {
            style: { ...this.inlineStyle(combinedStyle), color:'#0000EE', textDecoration:'underline' },
            on: { click: () => this.onLinkClick(node.attrs.href) }
          }, text);
        }
        return h('text', { style: this.inlineStyle(combinedStyle) }, text);
      }

      const children = (node.children||[]).map(c => this.renderNode(c, h, parentForm));
      const containerStyle = this.inlineStyle(combinedStyle);

      const layoutTags = ['div','section','header','footer','nav','main','aside','figure','ul','ol','details'];
      if (layoutTags.includes(node.tag)) {
        containerStyle.flexDirection = 'row';
        containerStyle.flexWrap = 'wrap';
      } else if (this.shouldUseRowLayout(node.children)) {
        containerStyle.flexDirection = 'row';
        containerStyle.alignItems = 'center';
        containerStyle.flexWrap = 'wrap';
      }

      return h('div', { style: containerStyle }, children);
    },

    shouldUseRowLayout(children) {
      if (!children || !children.length) return false;
      return children.every(child => {
        if (!child) return true;
        if (child.type === 'text') return true;
        const inlineTags = ['span','a','strong','b','em','i','u','font','code','sub','sup','img','br','label','small',
                            'abbr','acronym','bdi','bdo','cite','del','dfn','ins','kbd','mark','q','s','samp','var'];
        if (inlineTags.includes(child.tag)) return true;
        const merged = this.getCombinedStyle(child);
        if (merged.display === 'inline' || merged.display === 'inline-block' || merged.display === 'inline-flex') return true;
        return false;
      });
    },

    getCombinedStyle(node) {
      const tagDefaults = {
        h1: { fontSize:'2em', fontWeight:'bold', margin:'20px 0 10px 0', color:'#000' },
        h2: { fontSize:'1.5em', fontWeight:'bold', margin:'16px 0 8px 0', color:'#000' },
        h3: { fontSize:'1.17em', fontWeight:'bold', margin:'12px 0 6px 0', color:'#000' },
        p: { margin:'0 0 10px 0', lineHeight:'1.6', color:'#000' },
        div: { margin:'0 0 4px 0', color:'#000' },
        ul: { margin:'0 0 8px 20px', color:'#000' },
        ol: { margin:'0 0 8px 20px', color:'#000' },
        li: { margin:'0 0 4px 0', color:'#000' },
        a: { color:'#0000EE', textDecoration:'underline' },
        span: { color:'#000' },
        pre: { fontFamily:'monospace', whiteSpace:'pre', margin:'10px 0', padding:'10px', backgroundColor:'#f5f5f5', fontSize:'14px' },
        code: { fontFamily:'monospace', backgroundColor:'#f0f0f0', padding:'2px 4px', fontSize:'0.9em' },
        kbd: { fontFamily:'monospace', backgroundColor:'#eee', border:'1px solid #ccc', borderRadius:'3px', padding:'2px 4px' },
        samp: { fontFamily:'monospace' },
        del: { textDecoration:'line-through' },
        ins: { textDecoration:'underline' },
        mark: { backgroundColor:'#ff0' },
        blockquote: { borderLeft:'4px solid #ccc', paddingLeft:'10px', margin:'10px 0', color:'#555' },
        dl: { margin:'10px 0' },
        dt: { fontWeight:'bold' },
        dd: { marginLeft:'20px', marginBottom:'8px' },
        figcaption: { fontSize:'0.9em', color:'#666', marginTop:'5px' },
        details: { margin:'10px 0' },
        summary: { fontWeight:'bold', cursor:'pointer' },
        table: { margin:'10px 0' },
        td: { padding:'4px 8px' },
        th: { padding:'4px 8px', fontWeight:'bold' },
        button: { margin:'4px 0', padding:'8px 16px', backgroundColor:'#ddd', borderRadius:'4px', border:'1px solid #ccc', color:'#000' },
        input: { margin:'4px 0' },
        textarea: { width:'100%', height:'60px', margin:'4px 0' },
        select: { margin:'4px 0' },
        form: { margin:'10px 0' }
      };
      const cssMatched = this.matchCSSRules(node);
      const inline = node.styles || {};
      const merged = { ...(tagDefaults[node.tag] || {}), ...cssMatched, ...inline };
      const bg = merged.backgroundColor || '#ffffff';
      const tc = merged.color || '#000000';
      if (tc.toLowerCase() === '#ffffff' && bg.toLowerCase() === '#ffffff') {
        merged.color = '#000000';
      }
      if (!merged.color) merged.color = '#000000';
      if (!merged.fontSize) merged.fontSize = '16px';
      return merged;
    },

    getInnerText(node) {
      if (!node) return '';
      if (node.type === 'text') return node.text;
      if (node.children) return node.children.map(c => this.getInnerText(c)).join('');
      return '';
    },

    hasImageOrBlock(node) {
      if (!node) return false;
      if (node.tag === 'img') return true;
      const block = ['div','p','h1','h2','h3','h4','h5','h6','ul','ol','li',
                     'header','footer','section','article','blockquote',
                     'form','nav','main','aside','figure','input','textarea','button','select','table','tr','td','th',
                     'pre','dl','dt','dd','details','summary','figcaption'];
      if (block.includes(node.tag)) return true;
      if (node.children) return node.children.some(c => this.hasImageOrBlock(c));
      return false;
    },

    inlineStyle(styleObj) {
      const allowed = [
        'color','fontSize','fontWeight','fontStyle','lineHeight',
        'backgroundColor','textDecoration','width','height',
        'margin','marginTop','marginBottom','marginLeft','marginRight',
        'padding','paddingTop','paddingBottom','paddingLeft','paddingRight',
        'textAlign','border','borderRadius','verticalAlign',
        'position','whiteSpace','fontFamily'
      ];
      const css = {};
      for (let k in styleObj) {
        if (allowed.includes(k)) {
          css[k.replace(/([A-Z])/g,'-$1').toLowerCase()] = styleObj[k];
        }
      }
      return css;
    }
  },

  render(h) {
    if (this.loading) return h('div', { class:'center' }, [h('text','加载中...')]);
    if (this.error || !this.nodeTree) {
      return h('div', { class:'center' }, [h('text','无法加载: ' + this.errorMsg)]);
    }
    return h('scroller', {
      style: { flex:1, flexDirection:'column' },
      attrs: { 'scroll-direction':'vertical', 'show-scrollbar':true, scrollable:true }
    }, [
      h('div', {
        style: { flexDirection:'column', padding:'10px', backgroundColor:'#ffffff' }
      }, (this.nodeTree || []).map(n => this.renderNode(n, h, null)))
    ]);
  }
}
</script>

<style scoped>
.center { flex: 1; justify-content: center; align-items: center; }
</style>

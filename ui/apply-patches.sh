#!/bin/bash
# Apply CI patches for aiot-vue-cli
set -e
cd "$(dirname "$0")"

echo "Applying CI patches for aiot-vue-cli..."

# Fix 1: Add TypeScript plugin to rollup config
sed -i "s/commonjs(),/commonjs(),require('@rollup\/plugin-typescript')(),/g" node_modules/aiot-vue-cli/src/libs/rollup.config.js

# Fix 2: Vue 3 SFC parser compatibility
sed -i "s/compiler.parseComponent(content, { pad: 'line' })/compiler.parse(content, { pad: 'line' }).descriptor/g" node_modules/aiot-vue-cli/web-loaders/falcon-vue-loader/lib/parser.js

# Fix 3: Use @vue/compiler-sfc for template compilation
sed -i "s/path.resolve(__dirname, '.\/vue\/packages\/vue-template-compiler\/index.js')/'@vue\/compiler-sfc'/g" node_modules/aiot-vue-cli/cli-libs/index.js

# Fix 4: compile -> compileTemplate
sed -i "s/compiler.compile/compiler.compileTemplate/g" node_modules/aiot-vue-cli/web-loaders/falcon-vue-loader/lib/template-compiler/index.js

# Fix 5: Parse component with Vue 3 API
sed -i "s/compiler.parseComponent(content, { pad: true })/compiler.parse(content, { pad: true }).descriptor/g" node_modules/aiot-vue-cli/src/libs/parser.js

# Fix 6: Replace defineComponent
sed -i "s/const replaceValues = {}/const replaceValues = { 'defineComponent': '' }/g" node_modules/aiot-vue-cli/src/libs/rollup.config.js

# Fix 7: Resolve relative image paths in image plugin (use importer as base)
sed -i "s/resolveId(id, importer) {/resolveId(id, importer) {\n      if (id.startsWith('.') \&\& importer) { id = require('path').resolve(require('path').dirname(importer), id); }/g" node_modules/aiot-vue-cli/src/rollup-plugins/image.js

echo "All patches applied!"
<script>
	import LibLoader from './LibLoader.svelte'

	let jsEditorElement;
	let luaEditorElement;

	let loadedDeps = 0;

	const NUM_DEPS = 3;
	const PARSE_OPTIONS = {
		ecmaVersion: 2021,
	};

	function setupEditor(editorElement, mode) {
		const editor = ace.edit(editorElement);
		editor.setTheme('ace/theme/tomorrow_night');
		editor.session.setMode(mode);
		editor.setShowPrintMargin(false);
		editorElement.style.fontSize = '16px';

		return editor;
	}

	function initEditors() {
		loadedDeps++;
		if (loadedDeps < NUM_DEPS) return; // Used to make sure all dependencies are loaded before initializing editors.

		const jsEditor = setupEditor(jsEditorElement, 'ace/mode/javascript');
		const luaEditor = setupEditor(luaEditorElement, 'ace/mode/lua');

		luaEditor.setReadOnly(true);

		function transpile() {
			const code = jsEditor.getValue();
			try {
				const ast = acorn.parse(code, PARSE_OPTIONS);
				const res = Transpiler.transpile(ast);
				luaEditor.setValue(formatText(res), -1);
			} catch (err) {
				luaEditor.setValue(err.message, -1);
			}
		}

		transpile();
		jsEditor.session.on('change', transpile);
	}
</script>

<LibLoader src="bundle.js" on:loaded={initEditors} libraryDetectionObject="formatText"/>
<LibLoader src="transpiler.js" on:loaded={initEditors} libraryDetectionObject="Transpiler"/>
<LibLoader src="https://pagecdn.io/lib/ace/1.4.6/ace.js" on:loaded={initEditors} libraryDetectionObject="ace"/>

<div bind:this={jsEditorElement} id="js-editor">{`while (true == true) {
	console.log('this works');
}
`}</div>
<div bind:this={luaEditorElement} id="lua-editor"></div>

<style>
	#js-editor {
        position: absolute;
        top: 0;
        right: 50%;
        bottom: 0;
        left: 0;
    }

	#lua-editor {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 50%;
    }
</style>
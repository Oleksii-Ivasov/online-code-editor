import React, { useEffect, useRef } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/htmlmixed/htmlmixed';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import ACTIONS from '../Actions';
import toast from 'react-hot-toast';

const Editor = ({ socketRef, roomId, onCodeChange }) => {
  let html = useRef('');
  let css = useRef('');
  let js = useRef('');
  let srcDoc = useRef('');
  function runMarkup() {
    if (
      !document.getElementsByTagName('iframe')[0]?.contentWindow.document ||
      !document.getElementsByTagName('iframe')[0]?.contentDocument
    ) {
      return;
    } else if (
      document.getElementsByTagName('iframe')[0].contentWindow.document
        .readyState == 'complete'
    ) {
      srcDoc.current = `
      <html>
      <body>${html.current}</body>
      <style>${css.current}</style>
      </html>`;
      document.getElementsByTagName(
        'iframe'
      )[0].contentWindow.document.body.innerHTML = srcDoc.current;
    }
  }

  document.addEventListener('keyup', runMarkup);

  function runScript() {
    let script = document.createElement('script');
    script.innerText = js.current;
    document
      .getElementsByTagName('iframe')[0]
      .contentWindow.document.body.appendChild(script);
    toast.success('Script executed successfully');
  }
  function createNewDocument() {
    let newWin = window.open('/output.html');
    newWin.onload = function () {
      newWin.document.body.innerHTML = srcDoc.current;
      let script = document.createElement('script');
      script.innerText = js.current;
      newWin.document.body.appendChild(script);
    };
  }

  const editorRef = useRef(null);
  const htmlEditorRef = useRef(null);
  const cssEditorRef = useRef(null);
  useEffect(() => {
    async function init() {
      editorRef.current = Codemirror.fromTextArea(
        document.getElementById('editor'),
        {
          mode: { name: 'javascript', json: true },
          theme: 'dracula',
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,
        }
      );
      htmlEditorRef.current = Codemirror.fromTextArea(
        document.getElementById('htmlEditor'),
        {
          mode: { name: 'htmlmixed' },
          theme: 'dracula',
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,
        }
      );
      cssEditorRef.current = Codemirror.fromTextArea(
        document.getElementById('cssEditor'),
        {
          mode: { name: 'css' },
          theme: 'dracula',
          autoCloseBrackets: true,
          lineNumbers: true,
        }
      );

      editorRef.current.on('change', (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();
        onCodeChange(code);
        localStorage.setItem('js', code);
        js.current = code;
        if (origin !== 'setValue') {
          socketRef.current.emit(ACTIONS.CODE_CHANGE, {
            roomId,
            code,
            editor: 'js',
          });
        }
      });
      htmlEditorRef.current.on('change', (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();
        onCodeChange(code);
        localStorage.setItem('html', code);
        html.current = code;
        if (origin !== 'setValue') {
          socketRef.current.emit(ACTIONS.CODE_CHANGE, {
            roomId,
            code,
            editor: 'html',
          });
        }
      });
      cssEditorRef.current.on('change', (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();
        onCodeChange(code);
        localStorage.setItem('css', code);
        css.current = code;
        if (origin !== 'setValue') {
          socketRef.current.emit(ACTIONS.CODE_CHANGE, {
            roomId,
            code,
            editor: 'css',
          });
        }
      });
    }
    init();
  }, []);

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code, editor }) => {
        if (code !== null) {
          if (editor === 'js') {
            editorRef.current.setValue(code);
          } else if (editor === 'html') {
            htmlEditorRef.current.setValue(code);
            runMarkup();
          } else if (editor === 'css') {
            cssEditorRef.current.setValue(code);
            runMarkup();
          } else if (!editor) {
            if (localStorage.getItem('js'))
              editorRef.current.setValue(localStorage.getItem('js'));
            if (localStorage.getItem('html'))
              htmlEditorRef.current.setValue(localStorage.getItem('html'));
            if (localStorage.getItem('css'))
              cssEditorRef.current.setValue(localStorage.getItem('css'));
            runMarkup();
          }
        }
      });
    }

    return () => {
      socketRef.current.off(ACTIONS.CODE_CHANGE);
    };
  }, [socketRef.current]);

  return (
    <>
      <button className="btn newTabBtn" onClick={createNewDocument}>
        Open output in new tab
      </button>
      <button className="btn runBtn" onClick={runScript}>
        Run JS
      </button>
      <div className="editorWrap">
        <textarea id="editor"></textarea>
        <textarea id="htmlEditor"></textarea>
        <textarea id="cssEditor"></textarea>
        <iframe frameBorder="0" title="code" id="frame"></iframe>
      </div>
    </>
  );
};

export default Editor;

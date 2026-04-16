import React, { useState, useRef, useEffect } from 'react';

const UNLOCK_EMAIL = 'cars@zenova.com';

const C = {
  headerBg:'#306998', headerTop:'#1e415e', headerBorder:'#ffd740',
  bg:'#ffffff', sidebarBg:'#f8f8f8', sidebarBorder:'#e0e0e0',
  text:'#333333', textLight:'#666666', link:'#0069cf',
  codeBg:'#f0f0f0', codeInline:'#e8e8e8', border:'#dddddd',
  noteBg:'#e7f2fa', noteBorder:'#6ab0de',
  warnBg:'#fff8e1', warnBorder:'#f0a500',
  depBg:'#fdecea', depBorder:'#e53935',
  newBg:'#e8f5e9', newBorder:'#43a047',
  activeNav:'#dbeafe', activeText:'#1e40af', activeBorder:'#3b82f6',
  footer:'#1e415e', footerText:'#b0c4d8', footerHead:'#ffffff',
};

/* ─── Shared components ─────────────────────────────────────────────── */
function Code({ c }) {
  return <code style={{background:C.codeInline,borderRadius:3,padding:'1px 5px',fontSize:'0.84em',fontFamily:'monospace'}}>{c}</code>;
}
function Note({ children }) {
  return <div style={{background:C.noteBg,borderLeft:`4px solid ${C.noteBorder}`,padding:'10px 14px',margin:'14px 0',borderRadius:'0 4px 4px 0',fontSize:'0.875rem'}}><strong style={{color:'#1565c0'}}>Note </strong>{children}</div>;
}
function Warning({ children }) {
  return <div style={{background:C.warnBg,borderLeft:`4px solid ${C.warnBorder}`,padding:'10px 14px',margin:'14px 0',borderRadius:'0 4px 4px 0',fontSize:'0.875rem'}}><strong style={{color:'#bf6000'}}>Warning </strong>{children}</div>;
}
function Deprecated({ version, children }) {
  return <div style={{background:C.depBg,borderLeft:`4px solid ${C.depBorder}`,padding:'10px 14px',margin:'14px 0',borderRadius:'0 4px 4px 0',fontSize:'0.875rem'}}><strong style={{color:'#c62828'}}>Deprecated since version {version}: </strong>{children}</div>;
}
function Added({ version, children }) {
  return <div style={{background:C.newBg,borderLeft:`4px solid ${C.newBorder}`,padding:'10px 14px',margin:'14px 0',borderRadius:'0 4px 4px 0',fontSize:'0.875rem'}}><strong style={{color:'#2e7d32'}}>New in version {version}: </strong>{children}</div>;
}

function colorize(line) {
  const KW=['def','class','return','import','from','as','if','elif','else','for','while','in','not','and','or','True','False','None','try','except','finally','with','yield','lambda','pass','break','continue','raise','del','global','nonlocal','assert','is','print','async','await','match','case','type'];
  const parts=[]; let rest=line, k=0;
  while(rest.length){
    const sm=rest.match(/^("""[\s\S]*?"""|'''[\s\S]*?'''|"[^"\n]*"|'[^'\n]*')/);
    if(sm){parts.push(<span key={k++} style={{color:'#2e7d32'}}>{sm[1]}</span>);rest=rest.slice(sm[1].length);continue;}
    const cm=rest.match(/^(#.*)/);
    if(cm){parts.push(<span key={k++} style={{color:'#999',fontStyle:'italic'}}>{cm[1]}</span>);rest=rest.slice(cm[1].length);continue;}
    const wm=rest.match(/^([a-zA-Z_]\w*)/);
    if(wm){const w=wm[1];if(KW.includes(w))parts.push(<span key={k++} style={{color:'#0055bb',fontWeight:600}}>{w}</span>);else if(/^[A-Z]/.test(w))parts.push(<span key={k++} style={{color:'#6a0dad'}}>{w}</span>);else parts.push(<span key={k++}>{w}</span>);rest=rest.slice(w.length);continue;}
    const nm=rest.match(/^(\d+\.?\d*)/);
    if(nm){parts.push(<span key={k++} style={{color:'#c62828'}}>{nm[1]}</span>);rest=rest.slice(nm[1].length);continue;}
    parts.push(<span key={k++}>{rest[0]}</span>);rest=rest.slice(1);
  }
  return parts;
}

function CodeBlock({ code, lang='python' }) {
  const lines=code.trimStart().split('\n');
  return (
    <div style={{border:`1px solid ${C.border}`,borderRadius:5,margin:'12px 0',overflow:'auto',fontFamily:'monospace'}}>
      <div style={{background:'#e4e4e4',padding:'3px 12px',display:'flex',justifyContent:'space-between',borderBottom:`1px solid ${C.border}`}}>
        <span style={{fontSize:'0.72rem',fontWeight:700,color:'#555'}}>{lang.toUpperCase()}</span>
        <span style={{fontSize:'0.68rem',color:'#888'}}>{lines.length} lines</span>
      </div>
      <div style={{background:C.codeBg,padding:'10px 0'}}>
        {lines.map((l,i)=>(
          <div key={i} style={{display:'flex',gap:12,lineHeight:1.55}}>
            <span style={{color:'#bbb',userSelect:'none',minWidth:32,textAlign:'right',paddingRight:4,fontSize:'0.75rem',flexShrink:0}}>{i+1}</span>
            <span style={{fontSize:'0.83rem',color:C.text,whiteSpace:'pre'}}>{colorize(l)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function H2({ id, children }) {
  return <h2 id={id} style={{fontSize:'1.3rem',fontWeight:700,borderBottom:`1px solid ${C.border}`,paddingBottom:6,marginTop:32,marginBottom:12,color:'#1a1a1a'}}>{children}</h2>;
}
function H3({ id, children }) {
  return <h3 id={id} style={{fontSize:'1.05rem',fontWeight:600,marginTop:22,marginBottom:8,color:'#1a1a1a'}}>{children}</h3>;
}
function P({ children }) {
  return <p style={{marginBottom:12,lineHeight:1.7}}>{children}</p>;
}

/* ─── TABLE helper ───────────────────────────────────────────────────── */
function DocTable({ heads, rows }) {
  return (
    <div style={{overflowX:'auto',margin:'14px 0'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.86rem'}}>
        <thead>
          <tr style={{background:'#e8e8e8'}}>
            {heads.map(h=><th key={h} style={{padding:'7px 12px',textAlign:'left',border:`1px solid ${C.border}`,fontWeight:700}}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row,i)=>(
            <tr key={i} style={{background:i%2===0?'#fff':'#f9f9f9'}}>
              {row.map((cell,j)=><td key={j} style={{padding:'6px 12px',border:`1px solid ${C.border}`,fontFamily:j===0?'monospace':'inherit',color:j===0?'#0055bb':C.text}}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PAGES
   ═══════════════════════════════════════════════════════════════════════ */
const PAGES = {

  /* ── INDEX ──────────────────────────────────────────────────────── */
  index: {
    title:'Python 3.12 Documentation',
    breadcrumb:[],
    toc:[],
    content: ()=>(
      <div style={{maxWidth:860,padding:'24px 40px 40px'}}>
        <h1 style={{fontSize:'2rem',fontWeight:800,color:'#1a1a1a',marginBottom:4}}>Python 3.12.0 documentation</h1>
        <p style={{fontSize:'1rem',color:C.textLight,marginBottom:28}}>Welcome! This is the official documentation for Python 3.12.0.</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:32}}>
          {[
            {id:'tut-intro',icon:'📖',title:"What's New",sub:'See what changed in Python 3.12'},
            {id:'tut-intro',icon:'🎓',title:'Tutorial',sub:'Start here for a quick overview'},
            {id:'lib-builtins',icon:'📚',title:'Library Reference',sub:'All standard library modules'},
            {id:'ref-lexical',icon:'🔤',title:'Language Reference',sub:'Syntax and language elements'},
            {id:'howto-regex',icon:'🛠️',title:'HOWTOs',sub:'In-depth guides for specific tasks'},
            {id:'ref-glossary',icon:'📝',title:'Glossary',sub:'Terms used in this documentation'},
          ].map(c=>(
            <div key={c.id+c.title} style={{background:'#f8f9ff',border:`1px solid ${C.border}`,borderRadius:8,padding:'16px 18px',cursor:'pointer'}}>
              <div style={{fontSize:'1.5rem',marginBottom:6}}>{c.icon}</div>
              <div style={{fontWeight:700,color:C.link,fontSize:'0.95rem',marginBottom:4}}>{c.title}</div>
              <div style={{fontSize:'0.8rem',color:C.textLight}}>{c.sub}</div>
            </div>
          ))}
        </div>
        <H2 id="whats-new">What's new in Python 3.12</H2>
        <P>Python 3.12 was released on October 2, 2023. It contains many new features and optimizations compared to 3.11.</P>
        <ul style={{paddingLeft:22,lineHeight:2.2}}>
          <li><strong>PEP 695</strong> — Type Parameter Syntax: <Code c="type Vector[T] = list[T]" /></li>
          <li><strong>PEP 692</strong> — Using <Code c="TypedDict" /> for <Code c="**kwargs" /> typing</li>
          <li><strong>PEP 698</strong> — Override decorator for static typing</li>
          <li><strong>PEP 684</strong> — Per-interpreter GIL</li>
          <li><strong>PEP 669</strong> — Low impact monitoring for CPython</li>
          <li><strong>Improved f-strings</strong> — Any valid Python expression now allowed</li>
          <li><strong>~15% faster</strong> than Python 3.11 on pyperformance suite</li>
          <li>Better error messages with more context</li>
        </ul>
        <H2 id="parts">Parts of the documentation</H2>
        <DocTable
          heads={['Section','Contents']}
          rows={[
            ["What's New in Python","What's changed between versions"],
            ['Tutorial','Teaches Python basics step by step'],
            ['Library Reference','All modules in the standard library'],
            ['Language Reference','Formal specification of the language'],
            ['Python Setup and Usage','How to install and configure Python'],
            ['HOWTOs','Specific-topic guides in tutorial style'],
            ['Installing Python Modules','How to use pip and PyPI'],
            ['Distributing Python Modules','Building and publishing packages'],
            ['Extending and Embedding','Writing C extensions'],
            ['Python/C API','Low-level C interface to Python'],
            ['FAQs','Frequently asked questions'],
          ]}
        />
      </div>
    ),
  },

  /* ── WHAT'S NEW ─────────────────────────────────────────────────── */
  new312: {
    title:"What's New In Python 3.12",
    breadcrumb:["What's New"],
    toc:['Summary','New Features','New Typing Features','Performance','Deprecated','Removed'],
    content: ()=>(
      <div style={{maxWidth:860,padding:'0 40px 40px',lineHeight:1.7}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,marginBottom:8}}>What's New In Python 3.12</h1>
        <p style={{color:C.textLight,marginBottom:24}}>Release date: October 2, 2023 — Editor: Adam Turner</p>
        <H2 id="summary">Summary – Release highlights</H2>
        <P>Python 3.12 is the latest stable release of the Python programming language, with a mix of changes to the language, the implementation, and the standard library.</P>
        <Added version="3.12">New type parameter syntax (PEP 695) makes generics much more readable.</Added>
        <H2 id="new-features">New Language Features</H2>
        <H3 id="f-strings">Improved f-strings (PEP 701)</H3>
        <P>f-strings can now contain any valid Python expression, including nested f-strings with the same quote type, multi-line expressions, and backslashes:</P>
        <CodeBlock code={`# Previously invalid — now allowed in 3.12
print(f"{'Hello'!r}")          # nested same quotes
print(f"{'\n'.join(names)}")   # backslash in expression
print(f"""
  Result: {
    value * 2    # comment inside f-string
  }
""")

# Reusing same quote characters
name = "World"
print(f"Hello, {"World"}")  # OK in 3.12!`} />
        <H3 id="type-params">Type Parameter Syntax (PEP 695)</H3>
        <P>A new, compact syntax for declaring generic functions, classes, and type aliases:</P>
        <CodeBlock code={`# Old style (3.11 and earlier)
from typing import TypeVar, Generic
T = TypeVar('T')
def first(l: list[T]) -> T:
    return l[0]

# New style (3.12+)
def first[T](l: list[T]) -> T:
    return l[0]

# Generic classes
class Stack[T]:
    def __init__(self) -> None:
        self._items: list[T] = []
    def push(self, item: T) -> None:
        self._items.append(item)
    def pop(self) -> T:
        return self._items.pop()

# Type aliases
type Vector[T] = list[T]
type Matrix[T] = list[Vector[T]]
type Alias = list[int]  # simple alias`} />
        <H3 id="override">@override decorator (PEP 698)</H3>
        <CodeBlock code={`from typing import override

class Parent:
    def method(self) -> int:
        return 1

class Child(Parent):
    @override            # type checker error if Parent.method doesn't exist
    def method(self) -> int:
        return 2`} />
        <H2 id="perf">Performance</H2>
        <P>Python 3.12 is approximately 15% faster than Python 3.11 on the pyperformance benchmark suite. Key optimizations include:</P>
        <ul style={{paddingLeft:22,lineHeight:2}}>
          <li>Improved <Code c="LOAD_FAST" /> specialization for common variable types</li>
          <li>More efficient list and dict creation</li>
          <li>Reduced overhead in class method calls</li>
          <li>Better inlining of small functions</li>
          <li>Faster <Code c="comprehensions" /> — comprehension inlining eliminates frame creation</li>
        </ul>
        <H2 id="deprecated">Deprecated</H2>
        <Deprecated version="3.12">The <Code c="distutils" /> package has been removed. Use <Code c="setuptools" /> instead.</Deprecated>
        <Deprecated version="3.12"><Code c="asynchat" />, <Code c="asyncore" />, and <Code c="imghdr" /> modules have been removed.</Deprecated>
        <H2 id="removed">Removed</H2>
        <DocTable
          heads={['Removed','Replacement']}
          rows={[
            ['distutils package','setuptools'],
            ['asynchat module','asyncio'],
            ['asyncore module','asyncio'],
            ['imghdr module','filetype (PyPI) or identify (PyPI)'],
            ['mailcap module','mimetypes'],
            ['cgi.log()','logging module'],
          ]}
        />
      </div>
    ),
  },

  /* ── TUTORIAL INTRO ─────────────────────────────────────────────── */
  'tut-intro': {
    title:'1. Whetting Your Appetite',
    breadcrumb:['Tutorial'],
    toc:['Why Python?','What Can Python Do?','Python Features'],
    content: ()=>(
      <div style={{maxWidth:860,padding:'0 40px 40px',lineHeight:1.7}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,marginBottom:8}}>1. Whetting Your Appetite</h1>
        <P>If you do much work on computers, eventually you find that there's some task you'd like to automate. For example, you may wish to perform a search-and-replace over a large number of text files, or rename and rearrange a bunch of photo files in a complicated way.</P>
        <H2 id="why">Why Python?</H2>
        <P>Python is simple to use, but it is a real programming language, offering much more structure and support for large programs than shell scripts or batch files can offer. On the other hand, Python also offers much more error checking than C, and, being a very-high-level language, it has high-level data types built in, such as flexible arrays and dictionaries.</P>
        <P>Python allows you to split your program into modules that can be reused in other Python programs. It comes with a large collection of standard modules that you can use as the basis of your programs — or as examples to start learning to program in Python.</P>
        <H2 id="what">What Can Python Do?</H2>
        <ul style={{paddingLeft:22,lineHeight:2.2}}>
          <li><strong>Web development</strong> — Django, Flask, FastAPI, Starlette</li>
          <li><strong>Data science</strong> — NumPy, pandas, Matplotlib, scikit-learn</li>
          <li><strong>Automation &amp; scripting</strong> — file management, web scraping, testing</li>
          <li><strong>Machine learning &amp; AI</strong> — TensorFlow, PyTorch, Keras</li>
          <li><strong>Desktop GUIs</strong> — tkinter, PyQt, wxPython</li>
          <li><strong>Game development</strong> — pygame, arcade</li>
          <li><strong>System administration</strong> — Ansible, SaltStack</li>
          <li><strong>Scientific computing</strong> — SciPy, Astropy, Biopython</li>
        </ul>
        <H2 id="features">Python Features</H2>
        <P>Python is an interpreted language, which can save you considerable time during program development because no compilation and linking is necessary. The interpreter can be used interactively, which makes it easy to experiment with features of the language, to write throw-away programs, or to test functions during bottom-up program development.</P>
        <CodeBlock code={`# Python is often described as executable pseudocode.
# This is a complete, runnable program:

def greet(name: str, times: int = 1) -> None:
    """Print a greeting message."""
    for _ in range(times):
        print(f"Hello, {name}!")

if __name__ == "__main__":
    greet("World")
    greet("Python", times=3)`} />
        <Note>Python's syntax enforces readability. Indentation is not optional — it defines code blocks.</Note>
      </div>
    ),
  },

  /* ── USING THE INTERPRETER ──────────────────────────────────────── */
  'tut-interp': {
    title:'2. Using the Python Interpreter',
    breadcrumb:['Tutorial'],
    toc:['Invoking the Interpreter','Interactive Mode','Source Files','Encoding'],
    content: ()=>(
      <div style={{maxWidth:860,padding:'0 40px 40px',lineHeight:1.7}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,marginBottom:8}}>2. Using the Python Interpreter</h1>
        <H2 id="invoke">2.1. Invoking the Interpreter</H2>
        <P>The Python interpreter is usually installed as <Code c="/usr/local/bin/python3.12" /> on Unix systems. To start it, just type <Code c="python3" /> in your terminal. On Windows, use the <Code c="py" /> launcher.</P>
        <CodeBlock code={`# Start Python
$ python3
Python 3.12.0 (main, Oct 2 2023, 14:02:05)
[GCC 13.2.0] on linux
Type "help", "copyright", "credits" or "license" for more information.
>>>

# Run a script
$ python3 script.py

# Run a command directly
$ python3 -c "import sys; print(sys.version)"

# Run a module
$ python3 -m http.server 8080
$ python3 -m pytest
$ python3 -m venv myenv`} lang="bash" />
        <H2 id="interactive">2.1.1. Interactive Mode</H2>
        <P>When commands are read from a terminal (tty), the interpreter is said to be in interactive mode. The primary prompt is <Code c=">>>" /> and for continuation lines the secondary prompt is <Code c="..." />.</P>
        <CodeBlock code={`>>> the_world_is_flat = True
>>> if the_world_is_flat:
...     print("Be careful not to fall off!")
...
Be careful not to fall off!`} />
        <H2 id="argv">2.2. Argument Passing</H2>
        <P>When known to the interpreter, the script name and additional arguments thereafter are turned into a list of strings and assigned to the <Code c="argv" /> variable in the <Code c="sys" /> module:</P>
        <CodeBlock code={`import sys
print(sys.argv)
# python3 script.py arg1 arg2
# -> ['script.py', 'arg1', 'arg2']

# sys.argv[0] is the script name
# sys.argv[1:] are the arguments`} />
        <H2 id="encoding">2.2.2. Source Code Encoding</H2>
        <P>By default, Python source files are treated as encoded in UTF-8. To declare a non-default encoding, a special comment line should be added as the first or second line of the file:</P>
        <CodeBlock code={`# -*- coding: cp1252 -*-
# or simply:
# coding: utf-8`} />
        <Note>UTF-8 is the recommended encoding for all Python source files. The encoding declaration is rarely needed in modern code.</Note>
      </div>
    ),
  },

  /* ── INFORMAL INTRODUCTION ──────────────────────────────────────── */
  'tut-informal': {
    title:'3. An Informal Introduction to Python',
    breadcrumb:['Tutorial'],
    toc:['Using as Calculator','Numbers','Strings','Lists','First Steps'],
    content: ()=>(
      <div style={{maxWidth:860,padding:'0 40px 40px',lineHeight:1.7}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,marginBottom:8}}>3. An Informal Introduction to Python</h1>
        <H2 id="calc">3.1. Using Python as a Calculator</H2>
        <H3 id="numbers">3.1.1. Numbers</H3>
        <CodeBlock code={`>>> 2 + 2
4
>>> 50 - 5*6
20
>>> (50 - 5*6) / 4
5.0
>>> 8 / 5          # division always returns float
1.6
>>> 17 // 3        # floor division
5
>>> 17 % 3         # remainder
2
>>> 5 ** 2         # powers
25
>>> 2 ** 7
128`} />
        <P>In interactive mode, the last printed expression is assigned to the variable <Code c="_" />:</P>
        <CodeBlock code={`>>> tax = 12.5 / 100
>>> price = 100.50
>>> price * tax
12.5625
>>> price + _
113.0625
>>> round(_, 2)
113.06`} />
        <H3 id="strings">3.1.2. Text (Strings)</H3>
        <CodeBlock code={`>>> 'spam eggs'
'spam eggs'
>>> "doesn't"
"doesn't"
>>> '"Yes," they said.'
'"Yes," they said.'
>>> s = 'First line.\nSecond line.'
>>> print(s)
First line.
Second line.
>>> print(r'C:\Users\name')   # raw string
C:\Users\name
>>> # triple-quoted strings span multiple lines
>>> text = """
... Line one
... Line two
... """
>>> len(text)
20`} />
        <P>Strings can be concatenated with <Code c="+" /> and repeated with <Code c="*" />. They support slicing:</P>
        <CodeBlock code={`>>> word = 'Python'
>>> word[0]     # first char
'P'
>>> word[-1]    # last char
'n'
>>> word[2:5]   # slice
'tho'
>>> word[:2]    # from beginning
'Py'
>>> word[4:]    # to end
'on'
>>> word[-2:]   # last two chars
'on'
>>> len(word)
6`} />
        <H3 id="lists">3.1.3. Lists</H3>
        <CodeBlock code={`>>> squares = [1, 4, 9, 16, 25]
>>> squares[0]
1
>>> squares[-1]
25
>>> squares[2:]
[9, 16, 25]
>>> squares + [36, 49, 64]
[1, 4, 9, 16, 25, 36, 49, 64]
>>> squares.append(36)
>>> cubes = [x**3 for x in range(1, 6)]
>>> cubes
[1, 8, 27, 64, 125]`} />
        <H2 id="first-steps">3.2. First Steps Towards Programming</H2>
        <CodeBlock code={`>>> a, b = 0, 1
>>> while a < 10:
...     print(a)
...     a, b = b, a+b
...
0
1
1
2
3
5
8`} />
      </div>
    ),
  },

  /* ── CONTROL FLOW ───────────────────────────────────────────────── */
  'tut-control': {
    title:'4. More Control Flow Tools',
    breadcrumb:['Tutorial'],
    toc:['if','for','range()','break/continue','match','def','*args/**kwargs','lambda'],
    content: ()=>(
      <div style={{maxWidth:860,padding:'0 40px 40px',lineHeight:1.7}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,marginBottom:8}}>4. More Control Flow Tools</h1>
        <H2 id="if">4.1. if Statements</H2>
        <CodeBlock code={`x = int(input("Enter integer: "))
if x < 0:
    x = 0
    print('Negative changed to zero')
elif x == 0:
    print('Zero')
elif x == 1:
    print('Single')
else:
    print('More')`} />
        <H2 id="for">4.2. for Statements</H2>
        <CodeBlock code={`words = ['cat', 'window', 'defenestrate']
for w in words:
    print(w, len(w))

# Don't modify the collection while iterating — iterate over a copy:
for w in words[:]:
    if len(w) > 6:
        words.insert(0, w)`} />
        <H2 id="range">4.3. The range() Function</H2>
        <CodeBlock code={`list(range(10))       # [0, 1, 2, ..., 9]
list(range(5, 10))    # [5, 6, 7, 8, 9]
list(range(0, 10, 3)) # [0, 3, 6, 9]
list(range(-10, -100, -30))  # [-10, -40, -70]

# Iterating over indices
a = ['Mary', 'had', 'a', 'little', 'lamb']
for i in range(len(a)):
    print(i, a[i])`} />
        <H2 id="break">4.4. break, continue, else on loops</H2>
        <CodeBlock code={`for n in range(2, 10):
    for x in range(2, n):
        if n % x == 0:
            print(n, 'equals', x, '*', n//x)
            break
    else:
        # loop fell through without finding a factor
        print(n, 'is a prime number')`} />
        <H2 id="match">4.6. match Statements (PEP 634)</H2>
        <P>Python 3.10 introduced structural pattern matching, similar to switch/case in other languages but far more powerful:</P>
        <CodeBlock code={`def http_error(status):
    match status:
        case 400:
            return "Bad request"
        case 401 | 403:
            return "Not allowed"
        case 404:
            return "Not found"
        case 418:
            return "I'm a teapot"
        case _:
            return "Something else"

# Pattern matching on data structures
point = (1, 0)
match point:
    case (0, 0):
        print("Origin")
    case (x, 0):
        print(f"X={x}")
    case (0, y):
        print(f"Y={y}")
    case (x, y):
        print(f"X={x}, Y={y}")
    case _:
        raise ValueError("Not a point")`} />
        <H2 id="def">4.7. Defining Functions</H2>
        <CodeBlock code={`def fib(n):
    """Return a list of Fibonacci numbers up to n."""
    result = []
    a, b = 0, 1
    while a < n:
        result.append(a)
        a, b = b, a+b
    return result

# Default argument values
def ask_ok(prompt, retries=4, reminder='Please try again!'):
    while True:
        reply = input(prompt)
        if reply in {'y', 'ye', 'yes'}:
            return True
        if reply in {'n', 'no', 'nop', 'nope'}:
            return False
        retries -= 1
        if retries < 0:
            raise ValueError('invalid user response')
        print(reminder)`} />
        <H2 id="args">4.8. *args and **kwargs</H2>
        <CodeBlock code={`def cheeseshop(kind, *arguments, **keywords):
    print("-- Do you have any", kind, "?")
    print("-- I'm sorry, we're all out of", kind)
    for arg in arguments:
        print(arg)
    for kw in keywords:
        print(kw, ":", keywords[kw])

cheeseshop("Limburger", "It's very runny, sir.",
           shopkeeper="Michael Palin",
           client="John Cleese",
           sketch="Cheese Shop Sketch")`} />
        <H2 id="lambda">4.9. Lambda Expressions</H2>
        <CodeBlock code={`# Lambda creates small anonymous functions
double = lambda x: x * 2
double(5)   # 10

# Common use: sorting key function
pairs = [(1, 'one'), (2, 'two'), (3, 'three'), (4, 'four')]
pairs.sort(key=lambda pair: pair[1])
# -> [(4, 'four'), (1, 'one'), (3, 'three'), (2, 'two')]`} />
      </div>
    ),
  },

  /* ── DATA STRUCTURES ────────────────────────────────────────────── */
  'tut-structs': {
    title:'5. Data Structures',
    breadcrumb:['Tutorial'],
    toc:['List Methods','Stacks & Queues','Comprehensions','del','Tuples','Sets','Dicts','Looping'],
    content: ()=>(
      <div style={{maxWidth:860,padding:'0 40px 40px',lineHeight:1.7}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,marginBottom:8}}>5. Data Structures</h1>
        <H2 id="list-methods">5.1. More on Lists</H2>
        <DocTable heads={['Method','Returns','Description']}
          rows={[
            ['list.append(x)','None','Add item x to the end'],
            ['list.extend(iterable)','None','Extend list by appending all items from iterable'],
            ['list.insert(i, x)','None','Insert x before index i'],
            ['list.remove(x)','None','Remove first occurrence of x; raises ValueError if absent'],
            ['list.pop([i])','item','Remove and return item at index i (default: last)'],
            ['list.clear()','None','Remove all items — equivalent to del a[:]'],
            ['list.index(x[,s[,e]])','int','Return index of first x between start and end'],
            ['list.count(x)','int','Return number of times x appears'],
            ['list.sort(*, key=None, reverse=False)','None','Sort list in place'],
            ['list.reverse()','None','Reverse list in place'],
            ['list.copy()','list','Return a shallow copy — equivalent to a[:]'],
          ]}
        />
        <H2 id="stack">5.1.1. Using Lists as Stacks</H2>
        <CodeBlock code={`stack = [3, 4, 5]
stack.append(6)   # push
stack.append(7)
stack.pop()       # pop -> 7
stack             # [3, 4, 5, 6]`} />
        <H2 id="queue">5.1.2. Using Lists as Queues</H2>
        <CodeBlock code={`from collections import deque
queue = deque(["Eric", "John", "Michael"])
queue.append("Terry")        # Terry arrives
queue.append("Graham")       # Graham arrives
queue.popleft()              # Eric departs -> 'Eric'
queue.popleft()              # John departs -> 'John'
queue                        # deque(['Michael', 'Terry', 'Graham'])`} />
        <H2 id="comprehensions">5.1.3. List Comprehensions</H2>
        <CodeBlock code={`squares = [x**2 for x in range(10)]
# [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]

# With condition
[x**2 for x in range(10) if x % 2 == 0]
# [0, 4, 16, 36, 64]

# Nested
[(x, y) for x in [1,2,3] for y in [3,1,4] if x != y]
# [(1, 3), (1, 4), (2, 3), (2, 1), (2, 4), (3, 1), (3, 4)]

# Dict comprehension
{x: x**2 for x in range(5)}
# {0: 0, 1: 1, 2: 4, 3: 9, 4: 16}

# Set comprehension
{x for x in 'abracadabra' if x not in 'abc'}
# {'r', 'd'}`} />
        <H2 id="tuples">5.3. Tuples and Sequences</H2>
        <CodeBlock code={`t = 12345, 54321, 'hello!'
t[0]         # 12345
t            # (12345, 54321, 'hello!')
u = t, (1, 2, 3, 4, 5)  # nested tuples
u            # ((12345, 54321, 'hello!'), (1, 2, 3, 4, 5))

# Unpacking
x, y, z = t
print(x, y, z)    # 12345 54321 hello!`} />
        <H2 id="sets">5.4. Sets</H2>
        <CodeBlock code={`basket = {'apple', 'orange', 'apple', 'pear'}
basket          # {'orange', 'pear', 'apple'} — no duplicates!
'orange' in basket   # True
a = {1, 2, 3, 4}; b = {3, 4, 5, 6}
a - b           # {1, 2}          difference
a | b           # {1,2,3,4,5,6}  union
a & b           # {3, 4}          intersection
a ^ b           # {1,2,5,6}      symmetric difference`} />
        <H2 id="dicts">5.5. Dictionaries</H2>
        <CodeBlock code={`tel = {'jack': 4098, 'sape': 4139}
tel['guido'] = 4127
tel             # {'jack': 4098, 'sape': 4139, 'guido': 4127}
list(tel)       # ['jack', 'sape', 'guido']
sorted(tel)     # ['guido', 'jack', 'sape']
'guido' in tel  # True
dict(sape=4139, guido=4127, jack=4098)  # from keyword args`} />
        <H2 id="looping">5.6. Looping Techniques</H2>
        <CodeBlock code={`# enumerate: index + value
for i, v in enumerate(['tic', 'tac', 'toe']):
    print(i, v)

# zip: loop over two sequences together
questions = ['name', 'quest', 'favourite colour']
answers = ['Lancelot', 'the Holy Grail', 'blue']
for q, a in zip(questions, answers):
    print(f'What is your {q}?  It is {a}.')

# dict.items(): key + value
knights = {'gallahad': 'the pure', 'robin': 'the brave'}
for k, v in knights.items():
    print(k, v)

# reversed() and sorted()
for i in reversed(range(1, 10, 2)):
    print(i)`} />
      </div>
    ),
  },

  /* ── MODULES ────────────────────────────────────────────────────── */
  'tut-modules': {
    title:'6. Modules',
    breadcrumb:['Tutorial'],
    toc:['Import','from…import','__name__','dir()','Packages'],
    content: ()=>(
      <div style={{maxWidth:860,padding:'0 40px 40px',lineHeight:1.7}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,marginBottom:8}}>6. Modules</h1>
        <H2 id="modules-intro">6.1. Introduction</H2>
        <P>A module is a file containing Python definitions and statements. The file name is the module name with the suffix <Code c=".py" />. Within a module, the module's name (as a string) is available as the value of the global variable <Code c="__name__" />.</P>
        <CodeBlock code={`# fibo.py
def fib(n):
    """Write Fibonacci series up to n."""
    a, b = 0, 1
    while a < n:
        print(a, end=' ')
        a, b = b, a+b
    print()

def fib2(n):
    """Return Fibonacci series up to n."""
    result = []
    a, b = 0, 1
    while a < n:
        result.append(a)
        a, b = b, a+b
    return result`} />
        <CodeBlock code={`>>> import fibo
>>> fibo.fib(1000)
0 1 1 2 3 5 8 13 21 34 55 89 144 233 377 610 987
>>> fibo.fib2(100)
[0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]
>>> fibo.__name__
'fibo'`} />
        <H2 id="from-import">6.1.1. from … import</H2>
        <CodeBlock code={`from fibo import fib, fib2
fib(500)           # no prefix needed

from fibo import * # import all names (not recommended)

import fibo as fb  # alias
fb.fib(500)

from fibo import fib as fibonacci
fibonacci(500)`} />
        <H2 id="name-main">6.1.2. The __name__ == '__main__' pattern</H2>
        <CodeBlock code={`# In fibo.py — run tests only when executed directly, not when imported
if __name__ == "__main__":
    import sys
    fib(int(sys.argv[1]))

# CLI usage:
# $ python3 fibo.py 50
# 0 1 1 2 3 5 8 13 21 34`} />
        <H2 id="packages">6.4. Packages</H2>
        <P>Packages are a way of structuring Python's module namespace by using "dotted module names". For example, the module name <Code c="A.B" /> designates a submodule named <Code c="B" /> in a package named <Code c="A" />.</P>
        <CodeBlock code={`# Package structure
sound/                  # Top-level package
    __init__.py         # Initialize the package
    formats/            # Sub-package
        __init__.py
        wavread.py
        wavwrite.py
    effects/
        __init__.py
        echo.py
        surround.py

# Import examples
import sound.effects.echo
from sound.effects import echo
from sound.effects.echo import echofilter`} lang="text" />
      </div>
    ),
  },

  /* ── ERRORS ─────────────────────────────────────────────────────── */
  'tut-errors': {
    title:'8. Errors and Exceptions',
    breadcrumb:['Tutorial'],
    toc:['Syntax Errors','Exceptions','Handling','Raising','Chaining','User-defined','finally','with'],
    content: ()=>(
      <div style={{maxWidth:860,padding:'0 40px 40px',lineHeight:1.7}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,marginBottom:8}}>8. Errors and Exceptions</h1>
        <H2 id="syntax-errors">8.1. Syntax Errors</H2>
        <CodeBlock code={`>>> while True print('Hello')
  File "<stdin>", line 1
    while True print('Hello')
               ^^^^^
SyntaxError: invalid syntax`} />
        <H2 id="exceptions">8.2. Exceptions</H2>
        <CodeBlock code={`>>> 10 * (1/0)
ZeroDivisionError: division by zero
>>> 4 + spam*3
NameError: name 'spam' is not defined
>>> '2' + 2
TypeError: can only concatenate str (not "int") to str`} />
        <H2 id="handling">8.3. Handling Exceptions</H2>
        <CodeBlock code={`# Basic try/except
try:
    x = int(input("Enter a number: "))
except ValueError:
    print("Not a valid number!")

# Multiple except clauses
try:
    result = risky_operation()
except (RuntimeError, TypeError) as e:
    print(f"Error: {e}")
except OSError as e:
    print(f"OS error: {e.errno} {e.strerror}")
except Exception:
    raise   # re-raise unexpected exceptions
else:
    print("No exception occurred, result:", result)
finally:
    print("This always runs")`} />
        <H2 id="raising">8.4. Raising Exceptions</H2>
        <CodeBlock code={`raise ValueError("bad value")
raise RuntimeError from original_error   # exception chaining
raise   # re-raise current exception`} />
        <H2 id="user-defined">8.5. User-defined Exceptions</H2>
        <CodeBlock code={`class AppError(Exception):
    """Base class for application exceptions."""

class ValidationError(AppError):
    def __init__(self, field, message):
        self.field = field
        self.message = message
        super().__init__(f"Validation error on '{field}': {message}")

class DatabaseError(AppError):
    pass

try:
    raise ValidationError("email", "invalid format")
except ValidationError as e:
    print(e.field, "->", e.message)`} />
        <H2 id="exception-groups">8.9. Exception Groups (Python 3.11+)</H2>
        <Added version="3.11">Exception groups allow raising and handling multiple unrelated exceptions simultaneously.</Added>
        <CodeBlock code={`try:
    raise ExceptionGroup("multiple errors", [
        ValueError("bad value"),
        TypeError("wrong type"),
        KeyError("missing key"),
    ])
except* ValueError as eg:
    print(f"Caught {len(eg.exceptions)} ValueError(s)")
except* TypeError as eg:
    print(f"Caught {len(eg.exceptions)} TypeError(s)")`} />
      </div>
    ),
  },

  /* ── CLASSES ────────────────────────────────────────────────────── */
  'tut-classes': {
    title:'9. Classes',
    breadcrumb:['Tutorial'],
    toc:['Scopes','Class Syntax','Instances','Inheritance','Multiple Inheritance','Generators'],
    content: ()=>(
      <div style={{maxWidth:860,padding:'0 40px 40px',lineHeight:1.7}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,marginBottom:8}}>9. Classes</h1>
        <H2 id="class-def">9.3. A First Look at Classes</H2>
        <CodeBlock code={`class Dog:
    """A simple Dog class."""
    kind = 'canine'          # class variable

    def __init__(self, name):
        self.name = name     # instance variable
        self.tricks = []

    def add_trick(self, trick):
        self.tricks.append(trick)

    def __repr__(self):
        return f"Dog(name={self.name!r})"

    def __str__(self):
        return self.name

d = Dog('Fido')
e = Dog('Buddy')
d.add_trick('roll over')
e.add_trick('play dead')
d.tricks    # ['roll over']
e.tricks    # ['play dead']`} />
        <H2 id="inheritance">9.5. Inheritance</H2>
        <CodeBlock code={`class Animal:
    def __init__(self, name, sound):
        self.name = name
        self.sound = sound

    def speak(self):
        return f"{self.name} says {self.sound}"

class Dog(Animal):
    def __init__(self, name):
        super().__init__(name, "Woof")

    def fetch(self, item):
        return f"{self.name} fetches the {item}!"

class Cat(Animal):
    def __init__(self, name):
        super().__init__(name, "Meow")

    def purr(self):
        return "Purrr..."

dog = Dog("Rex")
cat = Cat("Whiskers")
print(dog.speak())   # Rex says Woof
print(cat.speak())   # Whiskers says Meow
isinstance(dog, Animal)   # True
issubclass(Dog, Animal)   # True`} />
        <H2 id="multiple-inheritance">9.5.1. Multiple Inheritance</H2>
        <CodeBlock code={`class Base1:
    def method(self):
        return "Base1"

class Base2:
    def method(self):
        return "Base2"

class Child(Base1, Base2):
    pass

# MRO: Method Resolution Order
Child.__mro__
# (<class 'Child'>, <class 'Base1'>, <class 'Base2'>, <class 'object'>)
Child().method()   # 'Base1'`} />
        <H2 id="generators">9.9. Generators</H2>
        <CodeBlock code={`def fibonacci():
    """Infinite Fibonacci generator."""
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a+b

gen = fibonacci()
[next(gen) for _ in range(10)]
# [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]

# Generator expression
sum_of_squares = sum(x**2 for x in range(10))
# 285`} />
      </div>
    ),
  },

  /* ── LEXICAL ANALYSIS ───────────────────────────────────────────── */
  'ref-lexical': {
    title:'2. Lexical Analysis',
    breadcrumb:['Language Reference'],
    toc:['Encoding','Line Structure','Indentation','Keywords','Identifiers','Literals','Operators'],
    content: ()=>(
      <div style={{maxWidth:860,padding:'0 40px 40px',lineHeight:1.7}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,marginBottom:8}}>2. Lexical Analysis</h1>
        <P>A Python program is read by a parser. Input to the parser is a stream of tokens, generated by the lexical analyzer. This chapter describes how the lexical analyzer breaks a file into tokens.</P>
        <H2 id="encoding">2.1. Line Structure &amp; Encoding</H2>
        <P>A Python source file is a sequence of logical lines. Each logical line is constructed from one or more physical lines by following the explicit or implicit line joining rules.</P>
        <H2 id="indent">2.1.8. Indentation</H2>
        <P>Leading whitespace (spaces and tabs) at the beginning of a logical line is used to determine the indentation level. Indentation cannot be mixed — use spaces only (PEP 8 recommends 4 spaces).</P>
        <Warning>Mixing tabs and spaces for indentation raises a <Code c="TabError" />.</Warning>
        <H2 id="keywords">2.3.1. Keywords</H2>
        <P>The following identifiers are used as reserved words, and cannot be used as ordinary identifiers:</P>
        <div style={{background:C.codeBg,border:`1px solid ${C.border}`,borderRadius:5,padding:'12px 16px',fontFamily:'monospace',fontSize:'0.85rem',lineHeight:2}}>
          {['False','None','True','and','as','assert','async','await','break','class','continue','def','del','elif','else','except','finally','for','from','global','if','import','in','is','lambda','nonlocal','not','or','pass','raise','return','try','while','with','yield'].map((kw,i)=>(
            <span key={kw}><span style={{color:'#0055bb',fontWeight:600}}>{kw}</span>{i<35?'   ':''}</span>
          ))}
        </div>
        <H2 id="string-literals">2.4.1. String and Bytes Literals</H2>
        <DocTable heads={['Prefix','Meaning']}
          rows={[
            ['(none)','Ordinary string (Unicode, UTF-8)'],
            ["r'' or R''","Raw string — backslashes are literal"],
            ["b'' or B''","Bytes literal"],
            ["rb'' or br''","Raw bytes literal"],
            ["f'' or F''","Formatted string literal (f-string)"],
            ["u''","Legacy Unicode prefix (no-op in Python 3)"],
          ]}
        />
        <H2 id="operators">2.6. Operators</H2>
        <div style={{background:C.codeBg,border:`1px solid ${C.border}`,borderRadius:5,padding:'12px 16px',fontFamily:'monospace',fontSize:'0.875rem',lineHeight:2.5,letterSpacing:'0.05em'}}>
          {['+ - * ** / // % @', '<< >> & | ^ ~ :=', '< > <= >= == !='].map(row=><div key={row}>{row}</div>)}
        </div>
      </div>
    ),
  },

  /* ── BUILT-IN FUNCTIONS ─────────────────────────────────────────── */
  'lib-builtins': {
    title:'Built-in Functions',
    breadcrumb:['Standard Library'],
    toc:['A-E','F-M','N-R','S-Z'],
    content: ()=>(
      <div style={{maxWidth:860,padding:'0 40px 40px',lineHeight:1.7}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,marginBottom:8}}>Built-in Functions</h1>
        <P>The Python interpreter has a number of functions and types built into it that are always available. They are listed here in alphabetical order.</P>
        <DocTable heads={['Function','Description']}
          rows={[
            ['abs(x)','Return the absolute value of a number'],
            ['aiter(async_iterable)','Return an asynchronous iterator (3.10+)'],
            ['all(iterable)','Return True if all elements are true (or iterable is empty)'],
            ['any(iterable)','Return True if any element is true'],
            ['ascii(object)','Return a string with non-ASCII chars escaped'],
            ['bin(x)','Convert integer to binary string: "0b..."'],
            ['bool([x])','Return Boolean value — True or False'],
            ['breakpoint(*args, **kws)','Drop into the debugger at call site'],
            ['bytearray([…])','Return a mutable sequence of bytes'],
            ['bytes([…])','Return an immutable bytes object'],
            ['callable(object)','Return True if object appears callable'],
            ['chr(i)','Return the string character for Unicode code point i'],
            ['classmethod(function)','Transform a method into a class method'],
            ['compile(source, …)','Compile source into a code object'],
            ['complex([real[, imag]])','Create a complex number'],
            ['delattr(object, name)','Delete the named attribute from the object'],
            ['dict(**kwarg)','Create a new dictionary'],
            ['dir([object])','Return list of names in current scope or object attributes'],
            ['divmod(a, b)','Return (quotient, remainder) pair'],
            ['enumerate(iterable, start=0)','Return enumerate object with (index, value) pairs'],
            ['eval(expression)','Evaluate a Python expression string'],
            ['exec(object)','Execute Python code dynamically'],
            ['filter(function, iterable)','Return iterator of items for which function is True'],
            ['float([x])','Return floating point number'],
            ['format(value[, format_spec])','Convert value to formatted string'],
            ['frozenset([iterable])','Return an immutable set object'],
            ['getattr(object, name[, default])','Return value of named attribute'],
            ['globals()','Return current global symbol table as dict'],
            ['hasattr(object, name)','Return True if object has the named attribute'],
            ['hash(object)','Return the hash value of the object'],
            ['help([object])','Invoke built-in help system'],
            ['hex(x)','Convert integer to hexadecimal string'],
            ['id(object)','Return the identity (memory address) of an object'],
            ['input([prompt])','Read a line from stdin'],
            ['int([x[, base]])','Return an integer'],
            ['isinstance(object, classinfo)','Return True if object is instance of classinfo'],
            ['issubclass(class, classinfo)','Return True if class is subclass of classinfo'],
            ['iter(object[, sentinel])','Return an iterator object'],
            ['len(s)','Return the length of an object'],
            ['list([iterable])','Create a mutable sequence (list)'],
            ['locals()','Return current local symbol table as dict'],
            ['map(function, iterable)','Return iterator applying function to each item'],
            ['max(iterable, …)','Return the largest item'],
            ['memoryview(object)','Return a memory view of the object'],
            ['min(iterable, …)','Return the smallest item'],
            ['next(iterator[, default])','Return next item from iterator'],
            ['object()','Return a new featureless object'],
            ['oct(x)','Convert integer to octal string'],
            ['open(file, mode="r", …)','Open a file and return a file object'],
            ['ord(c)','Return Unicode code point for character c'],
            ['pow(base, exp[, mod])','Return base to the power exp'],
            ['print(*objects, sep=" ", end="\\n", file=sys.stdout)','Print objects to stream'],
            ['property(fget=None, …)','Return a property attribute'],
            ['range(stop) / range(start, stop[, step])','Return an immutable range sequence'],
            ['repr(object)','Return a string representation of an object'],
            ['reversed(seq)','Return a reverse iterator'],
            ['round(number[, ndigits])','Round a number to ndigits decimal places'],
            ['set([iterable])','Return a new set object'],
            ['setattr(object, name, value)','Set the named attribute on the object'],
            ['slice(stop) / slice(start, stop[, step])','Return a slice object'],
            ['sorted(iterable, *, key=None, reverse=False)','Return a new sorted list'],
            ['staticmethod(function)','Transform a method into a static method'],
            ['str(object="")','Return a string version of the object'],
            ['sum(iterable, /, start=0)','Sum start and items of iterable'],
            ['super([type[, object-or-type]])','Return a proxy for delegating method calls'],
            ['tuple([iterable])','Return an immutable tuple'],
            ['type(object)','Return the type of an object'],
            ['vars([object])','Return __dict__ attribute of the object'],
            ['zip(*iterables, strict=False)','Return iterator of tuples'],
            ['__import__(name, …)','Called by import statement (advanced use)'],
          ]}
        />
      </div>
    ),
  },

  /* ── BUILT-IN EXCEPTIONS ────────────────────────────────────────── */
  'lib-exceptions': {
    title:'Built-in Exceptions',
    breadcrumb:['Standard Library'],
    toc:['Hierarchy','Base Classes','Concrete Exceptions','Warnings'],
    content: ()=>(
      <div style={{maxWidth:860,padding:'0 40px 40px',lineHeight:1.7}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,marginBottom:8}}>Built-in Exceptions</h1>
        <H2 id="hierarchy">Exception Hierarchy</H2>
        <CodeBlock code={`BaseException
├── SystemExit
├── KeyboardInterrupt
├── GeneratorExit
└── Exception
    ├── StopIteration
    ├── StopAsyncIteration
    ├── ArithmeticError
    │   ├── FloatingPointError
    │   ├── OverflowError
    │   └── ZeroDivisionError
    ├── AssertionError
    ├── AttributeError
    ├── BufferError
    ├── EOFError
    ├── ImportError
    │   └── ModuleNotFoundError
    ├── LookupError
    │   ├── IndexError
    │   └── KeyError
    ├── MemoryError
    ├── NameError
    │   └── UnboundLocalError
    ├── OSError
    │   ├── FileExistsError
    │   ├── FileNotFoundError
    │   ├── InterruptedError
    │   ├── IsADirectoryError
    │   ├── PermissionError
    │   └── TimeoutError
    ├── ReferenceError
    ├── RuntimeError
    │   ├── NotImplementedError
    │   └── RecursionError
    ├── SyntaxError
    │   └── IndentationError
    │       └── TabError
    ├── SystemError
    ├── TypeError
    ├── ValueError
    │   └── UnicodeError
    └── Warning
        ├── DeprecationWarning
        ├── PendingDeprecationWarning
        ├── RuntimeWarning
        ├── SyntaxWarning
        ├── ResourceWarning
        ├── FutureWarning
        ├── ImportWarning
        └── UnicodeWarning`} lang="text" />
        <H2 id="common">Common Exceptions</H2>
        <DocTable heads={['Exception','Raised when']}
          rows={[
            ['AttributeError','Attribute reference or assignment fails'],
            ['FileNotFoundError','File or directory not found'],
            ['ImportError','import statement fails to load a module'],
            ['IndexError','Sequence subscript is out of range'],
            ['KeyError','Dictionary key is not found'],
            ['KeyboardInterrupt','User presses Ctrl+C'],
            ['MemoryError','Operation runs out of memory'],
            ['NameError','Local or global name is not found'],
            ['OSError','System function returns a system-related error'],
            ['OverflowError','Arithmetic result too large to represent'],
            ['RecursionError','Maximum recursion depth exceeded'],
            ['RuntimeError','Does not fall in any other category'],
            ['StopIteration','next() called on exhausted iterator'],
            ['TypeError','Operation applied to wrong type'],
            ['ValueError','Right type but inappropriate value'],
            ['ZeroDivisionError','Division or modulo operation with zero divisor'],
          ]}
        />
      </div>
    ),
  },

  /* ── REGEX HOWTO ────────────────────────────────────────────────── */
  'howto-regex': {
    title:'Regular Expression HOWTO',
    breadcrumb:['HOWTOs'],
    toc:['Simple Patterns','Metacharacters','re Module','Groups','Flags','Examples'],
    content: ()=>(
      <div style={{maxWidth:860,padding:'0 40px 40px',lineHeight:1.7}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,marginBottom:8}}>Regular Expression HOWTO</h1>
        <p style={{color:C.textLight}}>Author: A.M. Kuchling &lt;amk@amk.ca&gt;</p>
        <H2 id="intro">Introduction</H2>
        <P>Regular expressions (called REs, or regexes) are a tiny, highly specialized programming language embedded inside Python and made available through the <Code c="re" /> module. Using this language, you specify the rules for the set of possible strings that you want to match.</P>
        <H2 id="patterns">Simple Patterns</H2>
        <CodeBlock code={`import re
p = re.compile('ab*')         # compile a pattern
m = p.match('abbbb')          # match at start
m.group()                     # 'abbbb'

re.search(r'\d+', 'abc 123 def')  # search anywhere
# <re.Match object; span=(4, 7), match='123'>

re.findall(r'\d+', 'a1 b22 c333')
# ['1', '22', '333']

re.sub(r'\s+', ' ', 'too   many   spaces')
# 'too many spaces'`} />
        <H2 id="metacharacters">Metacharacters</H2>
        <DocTable heads={['Metachar','Meaning']}
          rows={[
            ['.','Any character (except newline by default)'],
            ['^','Start of string (or line with re.MULTILINE)'],
            ['$','End of string (or line)'],
            ['*','0 or more repetitions'],
            ['+','1 or more repetitions'],
            ['?','0 or 1 repetition (also makes quantifiers non-greedy)'],
            ['{m,n}','Between m and n repetitions'],
            ['\\','Escape metacharacter or special sequence'],
            ['[]','Character class: [abc] matches a, b, or c'],
            ['|','Alternation: A|B matches A or B'],
            ['()','Group and capture'],
            ['(?:...)','Non-capturing group'],
            ['(?P<name>...)','Named capturing group'],
            ['(?=...)','Lookahead assertion'],
            ['(?!...)','Negative lookahead'],
            ['(?<=...)','Lookbehind assertion'],
          ]}
        />
        <H2 id="special">Special Sequences</H2>
        <DocTable heads={['Sequence','Matches']}
          rows={[
            ['\\d','Any decimal digit [0-9]'],
            ['\\D','Any non-digit character'],
            ['\\s','Any whitespace character [ \\t\\n\\r\\f\\v]'],
            ['\\S','Any non-whitespace character'],
            ['\\w','Any alphanumeric + underscore [a-zA-Z0-9_]'],
            ['\\W','Any non-word character'],
            ['\\b','Word boundary'],
            ['\\B','Non-word boundary'],
            ['\\A','Start of string'],
            ['\\Z','End of string'],
          ]}
        />
        <H2 id="flags">Flags</H2>
        <CodeBlock code={`re.compile(pattern, re.IGNORECASE)   # or re.I — case-insensitive
re.compile(pattern, re.MULTILINE)    # or re.M — ^ and $ match line boundaries
re.compile(pattern, re.DOTALL)       # or re.S — . matches any char including newline
re.compile(pattern, re.VERBOSE)      # or re.X — allow whitespace and comments

# Inline flags
re.search(r'(?i)hello', 'HELLO')`} />
        <H2 id="groups">Groups and Named Groups</H2>
        <CodeBlock code={`m = re.match(r'(\d{4})-(\d{2})-(\d{2})', '2023-10-15')
m.group(0)   # '2023-10-15'  (full match)
m.group(1)   # '2023'
m.group(2)   # '10'
m.groups()   # ('2023', '10', '15')

# Named groups
m = re.match(r'(?P<year>\d{4})-(?P<month>\d{2})', '2023-10')
m.group('year')    # '2023'
m.groupdict()      # {'year': '2023', 'month': '10'}`} />
      </div>
    ),
  },

  /* ── SORTING HOWTO ──────────────────────────────────────────────── */
  'howto-sorting': {
    title:'Sorting HOW TO',
    breadcrumb:['HOWTOs'],
    toc:['Basics','key Function','Operator Module','Multiple Keys','Reverse','Stability','cmp_to_key'],
    content: ()=>(
      <div style={{maxWidth:860,padding:'0 40px 40px',lineHeight:1.7}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,marginBottom:8}}>Sorting HOW TO</h1>
        <p style={{color:C.textLight}}>Author: Andrew Dalke and Raymond Hettinger</p>
        <H2 id="basics">Basics</H2>
        <CodeBlock code={`# sorted() returns a new sorted list
sorted([5, 2, 3, 1, 4])           # [1, 2, 3, 4, 5]
sorted("This is a test".split())  # ['This', 'a', 'is', 'test']

# list.sort() sorts in place
a = [5, 2, 3, 1, 4]
a.sort()
a   # [1, 2, 3, 4, 5]

# reverse
sorted([5, 2, 3, 1, 4], reverse=True)  # [5, 4, 3, 2, 1]`} />
        <H2 id="key">Key Functions</H2>
        <CodeBlock code={`# sort strings case-insensitively
sorted("This Is A Test".split(), key=str.lower)
# ['A', 'Is', 'Test', 'This']

# sort by string length
words = ['banana', 'apple', 'fig', 'cherry']
sorted(words, key=len)
# ['fig', 'apple', 'banana', 'cherry']

# sort list of dicts by a field
students = [
    {'name': 'Alice', 'grade': 'A', 'age': 22},
    {'name': 'Bob',   'grade': 'B', 'age': 19},
    {'name': 'Carol', 'grade': 'A', 'age': 20},
]
sorted(students, key=lambda s: s['age'])
# Bob(19), Carol(20), Alice(22)`} />
        <H2 id="operator">operator Module</H2>
        <CodeBlock code={`from operator import itemgetter, attrgetter

# itemgetter for dicts / sequences
sorted(students, key=itemgetter('grade', 'age'))

# attrgetter for objects
class Student:
    def __init__(self, name, grade, age):
        self.name = name
        self.grade = grade
        self.age = age

student_objects = [Student('alice', 'A', 22), ...]
sorted(student_objects, key=attrgetter('grade', 'age'))`} />
        <H2 id="stability">Sort Stability and Complex Sorts</H2>
        <P>Python's sort is stable — records with equal keys retain their original order. This makes it easy to do multi-pass sorting:</P>
        <CodeBlock code={`# Sort by age, then by grade (two-pass technique)
s = sorted(students, key=itemgetter('age'))      # first by age
s = sorted(s, key=itemgetter('grade'))           # then by grade
# Records with same grade appear in age order

# Single-pass with tuple key (preferred)
sorted(students, key=itemgetter('grade', 'age'))`} />
        <Note>Python uses Timsort, a hybrid merge sort / insertion sort that performs very well on real-world data. Time complexity: O(n log n) worst case, O(n) best case (already-sorted data).</Note>
      </div>
    ),
  },

  /* ── LOGGING HOWTO ──────────────────────────────────────────────── */
  'howto-logging': {
    title:'Logging HOWTO',
    breadcrumb:['HOWTOs'],
    toc:['Basics','Levels','Handlers','Formatters','Logger Hierarchy','Configuration'],
    content: ()=>(
      <div style={{maxWidth:860,padding:'0 40px 40px',lineHeight:1.7}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,marginBottom:8}}>Logging HOWTO</h1>
        <p style={{color:C.textLight}}>Author: Vinay Sajip &lt;vinay_sajip@red-dove.com&gt;</p>
        <H2 id="basics">Basic Logging</H2>
        <CodeBlock code={`import logging

# Quick start — basicConfig
logging.basicConfig(level=logging.DEBUG,
                    format='%(asctime)s %(levelname)s %(message)s')

logging.debug('Debug message')
logging.info('Info message')
logging.warning('Warning — watch out!')
logging.error('An error occurred')
logging.critical('Critical failure')`} />
        <H2 id="levels">Logging Levels</H2>
        <DocTable heads={['Level','Numeric','When to use']}
          rows={[
            ['DEBUG','10','Detailed information, typically only during diagnosis'],
            ['INFO','20','Confirmation that things are working as expected'],
            ['WARNING','30','Something unexpected happened but the program still works'],
            ['ERROR','40','A more serious problem; some functionality failed'],
            ['CRITICAL','50','A very serious error; the program may be unable to continue'],
          ]}
        />
        <H2 id="handlers">Handlers</H2>
        <CodeBlock code={`import logging
import logging.handlers

logger = logging.getLogger('myapp')
logger.setLevel(logging.DEBUG)

# Console handler
ch = logging.StreamHandler()
ch.setLevel(logging.WARNING)

# File handler
fh = logging.FileHandler('app.log')
fh.setLevel(logging.DEBUG)

# Rotating file handler
rh = logging.handlers.RotatingFileHandler(
    'app.log', maxBytes=10*1024*1024, backupCount=5
)

# Formatter
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
ch.setFormatter(formatter)
fh.setFormatter(formatter)

logger.addHandler(ch)
logger.addHandler(fh)`} />
        <H2 id="logrecord">LogRecord Attributes</H2>
        <DocTable heads={['Attribute','Format','Description']}
          rows={[
            ['asctime','%(asctime)s','Human-readable time: 2003-07-08 16:49:45,896'],
            ['filename','%(filename)s','Filename portion of pathname'],
            ['funcName','%(funcName)s','Name of function containing the logging call'],
            ['levelname','%(levelname)s','Text logging level'],
            ['lineno','%(lineno)d','Source line number'],
            ['message','%(message)s','The logged message'],
            ['module','%(module)s','Module (filename portion, without extension)'],
            ['name','%(name)s','Name of the logger'],
            ['pathname','%(pathname)s','Full pathname of source file'],
            ['process','%(process)d','Process ID'],
            ['thread','%(thread)d','Thread ID'],
          ]}
        />
        <H2 id="hierarchy">Logger Hierarchy</H2>
        <CodeBlock code={`# Loggers form a tree based on dotted names
logging.getLogger('root')           # root logger
logging.getLogger('myapp')          # child of root
logging.getLogger('myapp.web')      # child of myapp
logging.getLogger('myapp.db')       # sibling of myapp.web

# Propagation: messages go up the hierarchy unless propagate=False
child_logger = logging.getLogger('myapp.tasks')
child_logger.propagate = False      # stop propagation`} />
      </div>
    ),
  },

  /* ── OS MODULE ──────────────────────────────────────────────────── */
  'lib-os': {
    title:'os — Miscellaneous operating system interfaces',
    breadcrumb:['Standard Library'],
    toc:['Process Params','File Operations','Directories','Path','Environment'],
    content: ()=>(
      <div style={{maxWidth:860,padding:'0 40px 40px',lineHeight:1.7}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,marginBottom:8}}>os — Miscellaneous operating system interfaces</h1>
        <P>This module provides a portable way of using operating system dependent functionality. If you just want to read or write a file see <Code c="open()" />; if you want to manipulate paths, see the <Code c="os.path" /> module.</P>
        <CodeBlock code={`import os

# Current directory
os.getcwd()                       # '/home/user/project'
os.chdir('/tmp')                  # change directory

# Environment variables
os.environ.get('HOME', '/root')   # get with default
os.environ['MY_VAR'] = 'value'    # set

# Run a command
os.system('ls -la')               # returns exit code
result = os.popen('date').read()  # capture output

# File operations
os.rename('old.txt', 'new.txt')
os.remove('file.txt')
os.makedirs('a/b/c', exist_ok=True)
os.rmdir('empty_dir')

# Directory listing
os.listdir('.')                   # list files
for root, dirs, files in os.walk('/tmp'):
    for f in files:
        print(os.path.join(root, f))`} />
        <H2 id="path">os.path — Common pathname manipulations</H2>
        <DocTable heads={['Function','Returns','Example']}
          rows={[
            ['os.path.join(a, b)','str','join("/usr", "bin") → "/usr/bin"'],
            ['os.path.split(path)','(head, tail)','split("/a/b.txt") → ("/a", "b.txt")'],
            ['os.path.basename(path)','str','basename("/a/b.txt") → "b.txt"'],
            ['os.path.dirname(path)','str','dirname("/a/b.txt") → "/a"'],
            ['os.path.exists(path)','bool','exists("/etc/hosts") → True'],
            ['os.path.isfile(path)','bool','True if path is a regular file'],
            ['os.path.isdir(path)','bool','True if path is a directory'],
            ['os.path.abspath(path)','str','Return absolute path'],
            ['os.path.expanduser(path)','str','~ → /home/username'],
            ['os.path.splitext(path)','(root, ext)','splitext("a.txt") → ("a", ".txt")'],
            ['os.path.getsize(path)','int','Size in bytes'],
          ]}
        />
      </div>
    ),
  },

  /* ── COLLECTIONS ────────────────────────────────────────────────── */
  'lib-collections': {
    title:'collections — Container datatypes',
    breadcrumb:['Standard Library'],
    toc:['namedtuple','deque','Counter','defaultdict','OrderedDict','ChainMap'],
    content: ()=>(
      <div style={{maxWidth:860,padding:'0 40px 40px',lineHeight:1.7}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,marginBottom:8}}>collections — Container datatypes</h1>
        <H2 id="namedtuple">collections.namedtuple</H2>
        <CodeBlock code={`from collections import namedtuple

Point = namedtuple('Point', ['x', 'y'])
p = Point(11, y=22)
p.x + p.y              # 33
p._asdict()            # {'x': 11, 'y': 22}
p._replace(x=100)      # Point(x=100, y=22)

# With defaults (Python 3.6.1+)
Employee = namedtuple('Employee', ['name', 'dept', 'salary'],
                      defaults=['engineering', 50000])
Employee('John')   # Employee(name='John', dept='engineering', salary=50000)`} />
        <H2 id="deque">collections.deque</H2>
        <CodeBlock code={`from collections import deque

d = deque('ghi')
d.appendleft('f')       # add to left
d.append('j')           # add to right
d.popleft()             # remove from left -> 'f'
d.pop()                 # remove from right -> 'j'
d.rotate(1)             # rotate right by 1
d.rotate(-1)            # rotate left by 1
deque(maxlen=3)         # bounded deque — old items auto-removed`} />
        <H2 id="counter">collections.Counter</H2>
        <CodeBlock code={`from collections import Counter

c = Counter('gallahad')
# Counter({'a': 3, 'l': 2, 'g': 1, 'h': 1, 'd': 1})
c.most_common(3)
# [('a', 3), ('l', 2), ('g', 1)]

words = ['red', 'blue', 'red', 'green', 'blue', 'blue']
Counter(words)
# Counter({'blue': 3, 'red': 2, 'green': 1})

# Arithmetic
c1 = Counter(a=3, b=1); c2 = Counter(a=1, b=2)
c1 + c2   # Counter({'a': 4, 'b': 3})
c1 - c2   # Counter({'a': 2})`} />
        <H2 id="defaultdict">collections.defaultdict</H2>
        <CodeBlock code={`from collections import defaultdict

# Automatic default value for missing keys
d = defaultdict(list)
d['key'].append(1)      # no KeyError — creates empty list
d['key'].append(2)
d   # defaultdict(<class 'list'>, {'key': [1, 2]})

# Group words by first letter
s = [('yellow', 1), ('blue', 2), ('yellow', 3), ('blue', 4)]
d = defaultdict(list)
for k, v in s:
    d[k].append(v)
# defaultdict(list, {'yellow': [1, 3], 'blue': [2, 4]})`} />
      </div>
    ),
  },

  /* ── GLOSSARY ───────────────────────────────────────────────────── */
  'ref-glossary': {
    title:'Glossary',
    breadcrumb:['Reference'],
    toc:['A-D','E-L','M-P','Q-Z'],
    content: ()=>(
      <div style={{maxWidth:860,padding:'0 40px 40px',lineHeight:1.7}}>
        <h1 style={{fontSize:'1.8rem',fontWeight:700,marginBottom:8}}>Glossary</h1>
        {[
          ['argument','A value passed to a function or method when calling it. There are two kinds: keyword arguments (name=value) and positional arguments (value only).'],
          ['bytecode','The internal representation of a Python program in the CPython interpreter. Bytecode is cached in .pyc files so that executing the same file is faster the second time.'],
          ['callable','An object that can be called, i.e., has a __call__() method. This includes functions, methods, classes, and instances of classes that define __call__.'],
          ['class','A template for creating user-defined objects. Classes define attributes and methods that instances of that class will have.'],
          ['closure','A function that captures variables from its enclosing scope (free variables). The captured variables are stored in the function\'s __closure__ attribute.'],
          ['decorator','A function that takes another function as argument and returns a modified version. Often used with the @ syntax.'],
          ['descriptor','Any object that defines __get__(), __set__(), or __delete__(). When a descriptor is defined as a class attribute, its special methods are invoked on attribute lookup.'],
          ['duck typing','A programming style in Python where the type or class of an object is less important than the methods and attributes it has. "If it walks like a duck and it quacks like a duck, then it must be a duck."'],
          ['EAFP','Easier to Ask Forgiveness than Permission. A common Python coding style that assumes the existence of valid keys or attributes and catches exceptions if the assumption proves false.'],
          ['f-string','A string literal prefixed with f that contains Python expressions inside {} that are evaluated at runtime.'],
          ['GIL','Global Interpreter Lock. A mutex in CPython that prevents multiple native threads from executing Python bytecode simultaneously.'],
          ['generator','A function that uses yield to return values one at a time. When called, it returns a generator object that supports the iterator protocol.'],
          ['hashable','An object that has a hash value that never changes during its lifetime and can be compared to other objects. Hashable objects can be used as dictionary keys.'],
          ['immutable','An object with a fixed value that cannot be changed. Examples: numbers, strings, tuples. Contrast with mutable.'],
          ['iterable','An object capable of returning its members one at a time. Examples include lists, strings, files. An iterable implements __iter__ or __getitem__.'],
          ['iterator','An object that represents a stream of data. Iterators implement __next__() and __iter__(). Once exhausted, they raise StopIteration.'],
          ['keyword argument','An argument preceded by an identifier in a function call: func(name=value).'],
          ['lambda','An anonymous function defined with the lambda keyword: lambda x: x*2. Limited to a single expression.'],
          ['LBYL','Look Before You Leap. A coding style that checks preconditions before making calls. Contrast with EAFP.'],
          ['mutable','An object whose value can be changed after creation. Examples: lists, dicts, sets. Contrast with immutable.'],
          ['namespace','A mapping from names to objects. Examples: global namespace, local namespace, built-in namespace.'],
          ['package','A directory containing an __init__.py file and (optionally) sub-packages and modules.'],
          ['parameter','A named entity in a function definition that specifies an argument that the function can accept.'],
          ['REPL','Read-Eval-Print Loop. The interactive Python shell that reads input, evaluates it, prints the result, and loops.'],
          ['sequence','An iterable with efficient index-based element access. Examples: list, tuple, str, bytes, range.'],
          ['slice','An object usually containing a portion of a sequence. Created with the a[start:stop:step] syntax.'],
          ['type hint','An annotation that hints at the type of a variable, function parameter, or return value. Not enforced at runtime.'],
          ['virtual environment','A cooperatively isolated runtime environment that allows Python users and applications to install and upgrade Python distribution packages without interfering with system-level software.'],
        ].map(([term, def_])=>(
          <div key={term} style={{marginBottom:16,paddingBottom:16,borderBottom:`1px solid ${C.border}`}}>
            <div style={{fontWeight:700,color:C.link,fontSize:'0.95rem',marginBottom:4}} id={`term-${term}`}>{term}</div>
            <div style={{fontSize:'0.875rem',lineHeight:1.7}}>{def_}</div>
          </div>
        ))}
      </div>
    ),
  },

};

/* ─── Navigation structure ─────────────────────────────────────────── */
const NAV_SECTIONS = [
  { label:"What's New", items:[
    {id:'index',     label:'Python 3.12.0 Documentation'},
    {id:'new312',    label:"What's New In Python 3.12"},
    {id:'changelog', label:'Changelog'},
  ]},
  { label:'Tutorial', items:[
    {id:'tut-intro',    label:'1. Whetting Your Appetite'},
    {id:'tut-interp',   label:'2. Using the Interpreter'},
    {id:'tut-informal', label:'3. An Informal Introduction'},
    {id:'tut-control',  label:'4. More Control Flow Tools'},
    {id:'tut-structs',  label:'5. Data Structures'},
    {id:'tut-modules',  label:'6. Modules'},
    {id:'tut-io',       label:'7. Input and Output'},
    {id:'tut-errors',   label:'8. Errors and Exceptions'},
    {id:'tut-classes',  label:'9. Classes'},
    {id:'tut-stdlib',   label:'10. Brief Tour: Std Library'},
    {id:'tut-venv',     label:'12. Virtual Environments'},
  ]},
  { label:'Language Reference', items:[
    {id:'ref-intro',     label:'Introduction'},
    {id:'ref-lexical',   label:'2. Lexical Analysis'},
    {id:'ref-datamodel', label:'3. Data Model'},
    {id:'ref-execution', label:'4. Execution Model'},
    {id:'ref-import',    label:'5. The import system'},
    {id:'ref-expr',      label:'6. Expressions'},
    {id:'ref-simple',    label:'7. Simple Statements'},
    {id:'ref-compound',  label:'8. Compound Statements'},
  ]},
  { label:'Standard Library', items:[
    {id:'lib-builtins',    label:'Built-in Functions'},
    {id:'lib-constants',   label:'Built-in Constants'},
    {id:'lib-types',       label:'Built-in Types'},
    {id:'lib-exceptions',  label:'Built-in Exceptions'},
    {id:'lib-os',          label:'os — OS Interfaces'},
    {id:'lib-datetime',    label:'datetime — Date/Time'},
    {id:'lib-collections', label:'collections'},
    {id:'lib-functools',   label:'functools'},
    {id:'lib-itertools',   label:'itertools'},
    {id:'lib-pathlib',     label:'pathlib'},
    {id:'lib-json',        label:'json'},
    {id:'lib-re',          label:'re — Regex'},
    {id:'lib-math',        label:'math'},
    {id:'lib-asyncio',     label:'asyncio'},
    {id:'lib-threading',   label:'threading'},
    {id:'lib-subprocess',  label:'subprocess'},
    {id:'lib-socket',      label:'socket'},
    {id:'lib-http',        label:'http.client'},
    {id:'lib-urllib',      label:'urllib'},
    {id:'lib-logging',     label:'logging'},
    {id:'lib-unittest',    label:'unittest'},
    {id:'lib-sqlite3',     label:'sqlite3'},
    {id:'lib-csv',         label:'csv'},
    {id:'lib-io',          label:'io'},
  ]},
  { label:'HOWTOs', items:[
    {id:'howto-regex',       label:'Regular Expressions HOWTO'},
    {id:'howto-sorting',     label:'Sorting HOW TO'},
    {id:'howto-logging',     label:'Logging HOWTO'},
    {id:'howto-argparse',    label:'Argparse Tutorial'},
    {id:'howto-descriptor',  label:'Descriptor Guide'},
    {id:'howto-enum',        label:'Enum HOWTO'},
    {id:'howto-functional',  label:'Functional Programming'},
    {id:'howto-unicode',     label:'Unicode HOWTO'},
    {id:'howto-annotations', label:'Annotations Best Practices'},
  ]},
  { label:'Installing & Packaging', items:[
    {id:'inst-pip',   label:'Installing Python Modules'},
    {id:'inst-venv',  label:'Virtual Environments & Packages'},
    {id:'inst-dist',  label:'Distributing Python Modules'},
  ]},
  { label:'Extending Python', items:[
    {id:'ext-c',      label:'Extending with C/C++'},
    {id:'ext-ctypes', label:'ctypes HOWTO'},
    {id:'ext-capi',   label:'Python/C API Reference'},
  ]},
  { label:'Reference', items:[
    {id:'ref-faq',      label:'FAQs'},
    {id:'ref-glossary', label:'Glossary'},
    {id:'ref-bugs',     label:'Reporting Bugs'},
    {id:'ref-index',    label:'General Index'},
  ]},
];

/* ─── Stub for missing pages ────────────────────────────────────────── */
function StubPage({ pageId }) {
  const label = NAV_SECTIONS.flatMap(s=>s.items).find(i=>i.id===pageId)?.label || pageId;
  return (
    <div style={{maxWidth:860,padding:'0 40px 60px',lineHeight:1.7}}>
      <h1 style={{fontSize:'1.8rem',fontWeight:700,marginBottom:8}}>{label}</h1>
      <div style={{background:C.noteBg,border:`1px solid ${C.noteBorder}`,borderRadius:6,padding:'24px',marginTop:24}}>
        <p style={{margin:0,color:'#1565c0'}}>This page is part of the Python 3.12 documentation. Full content is available at <strong>docs.python.org/3</strong>.</p>
      </div>
      <P>This section covers <strong>{label}</strong> in depth. Topics include core concepts, detailed API references, practical examples, and notes on compatibility.</P>
      <CodeBlock code={`# Example usage
import ${pageId.replace(/[^a-z]/gi,'_').replace(/^lib_/,'')}

# See full documentation at docs.python.org/3/library/${pageId}.html`} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */
export default function CamoScreen({ onUnlock }) {
  const [currentPage, setCurrentPage] = useState('index');
  const [openSections, setOpenSections] = useState(()=>new Set(NAV_SECTIONS.map(s=>s.label)));
  const [email, setEmail] = useState('');
  const [subMsg, setSubMsg] = useState('');
  const [search, setSearch] = useState('');
  const mainRef = useRef(null);

  // Scroll to top on page change
  useEffect(()=>{ mainRef.current?.scrollTo(0,0); },[currentPage]);

  const toggleSection = (label)=>{
    setOpenSections(prev=>{ const n=new Set(prev); n.has(label)?n.delete(label):n.add(label); return n; });
  };

  const navigate = (id)=>{ setCurrentPage(id); };

  const handleEmailChange = (e)=>{
    setEmail(e.target.value);
    if(e.target.value===UNLOCK_EMAIL) setTimeout(onUnlock,150);
  };

  const handleEmailSubmit = (e)=>{
    e.preventDefault();
    if(email===UNLOCK_EMAIL){ onUnlock(); return; }
    setSubMsg('✓ You\'re subscribed to Python release news!');
    setEmail('');
  };

  // Filtered nav items
  const sq = search.toLowerCase();
  const visibleSections = NAV_SECTIONS.map(sec=>({
    ...sec,
    items: sq ? sec.items.filter(i=>i.label.toLowerCase().includes(sq)) : sec.items,
  })).filter(sec=>!sq||sec.items.length>0);

  // Page content
  const page = PAGES[currentPage];
  const Content = page ? page.content : ()=><StubPage pageId={currentPage}/>;
  const pageTitle = page?.title || (NAV_SECTIONS.flatMap(s=>s.items).find(i=>i.id===currentPage)?.label||'');

  // Prev/next within section
  const allItems = NAV_SECTIONS.flatMap(s=>s.items);
  const ci = allItems.findIndex(i=>i.id===currentPage);
  const prevPage = ci>0?allItems[ci-1]:null;
  const nextPage = ci<allItems.length-1?allItems[ci+1]:null;

  // Breadcrumb section
  const breadSection = NAV_SECTIONS.find(s=>s.items.some(i=>i.id===currentPage));

  return (
    <div style={s.root}>

      {/* ── TOP STRIP ─────────────────────────────────────────── */}
      <div style={s.topStrip}>
        <div style={s.topInner}>
          <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
            {['English','Español','Français','日本語','한국어','Português','Русский','中文'].map(l=>(
              <a key={l} href="#" onClick={e=>e.preventDefault()} style={{fontSize:'0.72rem',color:'#8899cc',textDecoration:'none'}}>{l}</a>
            ))}
          </div>
          <span style={{fontSize:'0.75rem',color:'#99aacc'}}>Python 3.12.0 documentation</span>
        </div>
      </div>

      {/* ── HEADER ────────────────────────────────────────────── */}
      <header style={s.header}>
        <div style={s.headerInner}>
          {/* Logo */}
          <div onClick={()=>navigate('index')} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',flexShrink:0}}>
            <svg width="38" height="38" viewBox="0 0 110 110" fill="none">
              <path d="M54 10 C30 10 32 30 32 44 L32 54 L78 54 L78 60 L22 60 C10 60 5 72 5 88 C5 102 14 110 28 110 L38 110 L38 100 C38 86 46 80 56 80 L82 80 C92 80 100 74 100 62 L100 36 C100 22 94 10 78 10 Z" fill="#306998"/>
              <path d="M56 100 C80 100 78 80 78 66 L78 56 L32 56 L32 50 L88 50 C100 50 105 38 105 22 C105 8 96 0 82 0 L72 0 L72 10 C72 24 64 30 54 30 L28 30 C18 30 10 36 10 48 L10 74 C10 88 16 100 32 100 Z" fill="#ffd140"/>
              <circle cx="40" cy="22" r="5" fill="#fff"/>
              <circle cx="70" cy="88" r="5" fill="#306998"/>
            </svg>
            <div>
              <div style={{color:'#fff',fontWeight:800,fontSize:'1.05rem',lineHeight:1.1}}>Python</div>
              <div style={{color:'#b8d4f0',fontSize:'0.7rem'}}>3.12.0 Documentation</div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{display:'flex',gap:0,alignItems:'stretch',flex:1,marginLeft:12}}>
            {[
              {label:"What's New",id:'new312'},
              {label:'Tutorial',id:'tut-informal'},
              {label:'Library',id:'lib-builtins'},
              {label:'Language Ref',id:'ref-lexical'},
              {label:'HOWTOs',id:'howto-regex'},
              {label:'Glossary',id:'ref-glossary'},
            ].map(n=>(
              <button key={n.id} onClick={()=>navigate(n.id)} style={{
                background:'transparent',border:'none',cursor:'pointer',
                color:'#cce',fontSize:'0.82rem',padding:'0 11px',
                fontWeight: currentPage===n.id?700:400,
                borderBottom: currentPage===n.id?'3px solid #ffd740':'3px solid transparent',
                fontFamily:'inherit',
              }}>{n.label}</button>
            ))}
          </nav>

          {/* Version */}
          <div style={{background:'rgba(0,0,0,0.25)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:4,padding:'3px 8px',flexShrink:0}}>
            <select style={{background:'transparent',border:'none',color:'#cce',fontSize:'0.78rem',cursor:'pointer',outline:'none'}}>
              <option>3.12 (stable)</option>
              <option>3.11</option>
              <option>3.10</option>
              <option>2.7 (legacy)</option>
            </select>
          </div>

          {/* Search */}
          <div style={s.headerSearch}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="#aaa">
              <path fillRule="evenodd" clipRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"/>
            </svg>
            <input style={s.headerSearchInput} placeholder="Search docs…"
              value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>
      </header>

      {/* ── BODY ──────────────────────────────────────────────── */}
      <div style={s.body}>

        {/* ── SIDEBAR ─────────────────────────────────────────── */}
        <aside style={s.sidebar}>
          <div style={{padding:'10px 8px 8px',borderBottom:`1px solid ${C.sidebarBorder}`}}>
            <div style={{fontSize:'0.68rem',color:C.textLight,marginBottom:4,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em'}}>Filter</div>
            <div style={{display:'flex',alignItems:'center',gap:6,background:'#fff',border:`1px solid ${C.border}`,borderRadius:4,padding:'4px 8px'}}>
              <svg width="11" height="11" viewBox="0 0 20 20" fill="#aaa">
                <path fillRule="evenodd" clipRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"/>
              </svg>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Filter…" style={{border:'none',outline:'none',fontSize:'0.78rem',width:'100%',background:'transparent'}}/>
            </div>
          </div>
          <div style={{overflowY:'auto',flex:1}}>
            {visibleSections.map(section=>(
              <div key={section.label}>
                <button onClick={()=>toggleSection(section.label)} style={s.sidebarSection}>
                  <span>{section.label}</span>
                  <svg width="9" height="9" viewBox="0 0 20 20" fill="#888"
                    style={{transform:openSections.has(section.label)?'rotate(0)':'rotate(-90deg)',transition:'transform 0.15s'}}>
                    <path fillRule="evenodd" clipRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                  </svg>
                </button>
                {openSections.has(section.label) && section.items.map(item=>(
                  <button key={item.id} onClick={()=>navigate(item.id)} style={{
                    ...s.sidebarItem,
                    background: currentPage===item.id ? C.activeNav : 'transparent',
                    color: currentPage===item.id ? C.activeText : C.textLight,
                    fontWeight: currentPage===item.id ? 600 : 400,
                    borderLeft: currentPage===item.id ? `3px solid ${C.activeBorder}` : '3px solid transparent',
                  }}>{item.label}</button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        {/* ── MAIN ────────────────────────────────────────────── */}
        <main ref={mainRef} style={s.main}>
          {/* Breadcrumbs */}
          <div style={{background:C.sidebarBg,borderBottom:`1px solid ${C.border}`,padding:'8px 40px',fontSize:'0.78rem',color:C.textLight,display:'flex',gap:6,alignItems:'center'}}>
            <button onClick={()=>navigate('index')} style={{background:'none',border:'none',cursor:'pointer',color:C.link,fontSize:'0.78rem',padding:0}}>Python 3.12.0</button>
            {breadSection && (<><span>»</span><span style={{color:C.textLight}}>{breadSection.label}</span></>)}
            {currentPage!=='index' && (<><span>»</span><span style={{color:C.text,fontWeight:500}}>{pageTitle}</span></>)}
          </div>

          {/* Prev / Next */}
          {(prevPage||nextPage) && (
            <div style={{display:'flex',justifyContent:'space-between',padding:'8px 40px',borderBottom:`1px solid ${C.border}`,fontSize:'0.8rem',background:'#fafafa'}}>
              {prevPage
                ? <button onClick={()=>navigate(prevPage.id)} style={{background:'none',border:'none',cursor:'pointer',color:C.link,padding:0}}>← {prevPage.label}</button>
                : <span/>}
              {nextPage
                ? <button onClick={()=>navigate(nextPage.id)} style={{background:'none',border:'none',cursor:'pointer',color:C.link,padding:0}}>{nextPage.label} →</button>
                : <span/>}
            </div>
          )}

          <Content />

          {/* Bottom nav */}
          {(prevPage||nextPage) && (
            <div style={{display:'flex',justifyContent:'space-between',padding:'16px 40px',borderTop:`1px solid ${C.border}`,fontSize:'0.8rem',background:'#fafafa'}}>
              {prevPage
                ? <button onClick={()=>navigate(prevPage.id)} style={{background:'none',border:'none',cursor:'pointer',color:C.link,padding:0}}>← {prevPage.label}</button>
                : <span/>}
              {nextPage
                ? <button onClick={()=>navigate(nextPage.id)} style={{background:'none',border:'none',cursor:'pointer',color:C.link,padding:0}}>{nextPage.label} →</button>
                : <span/>}
            </div>
          )}
          {/* ── FOOTER ────────────────────────────────────────────── */}
          <footer style={s.footer}>
          <div style={s.footerTop}>
          {[
            {head:'Python', links:['About Python','Getting Started','News','Community','Downloads','Documentation','Events']},
            {head:'Docs',   links:["What's New",'Tutorial','Library Reference','Language Reference','Python Setup','HOWTOs','FAQs']},
            {head:'Community', links:['Diversity & Inclusion','Mailing Lists','IRC','Forums','PSF Annual Impact Report','Python Insider Blog','Python Wiki']},
            {head:'PSF', links:['About the PSF','Membership','Nominations','Sponsorship','Grants','Code of Conduct','Privacy Policy']},
          ].map(col=>(
            <div key={col.head} style={s.footerCol}>
              <div style={s.footerHead}>{col.head}</div>
              {col.links.map(l=><a key={l} href="#" onClick={e=>e.preventDefault()} style={s.footerLink}>{l}</a>)}
            </div>
          ))}

          {/* Newsletter */}
          <div style={s.footerCol}>
            <div style={s.footerHead}>Stay Updated</div>
            <p style={{fontSize:'0.78rem',color:C.footerText,lineHeight:1.6,margin:'0 0 10px'}}>
              Get Python release announcements, security advisories, and community news delivered to your inbox.
            </p>
            <form onSubmit={handleEmailSubmit} style={{display:'flex',flexDirection:'column',gap:6}}>
              <input
                type="email"
                style={s.emailInput}
                placeholder="your@email.com"
                value={email}
                onChange={handleEmailChange}
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" style={s.emailBtn}>Subscribe →</button>
            </form>
            {subMsg && <p style={{fontSize:'0.75rem',color:'#90ee90',margin:'6px 0 0'}}>{subMsg}</p>}
            <p style={{fontSize:'0.72rem',color:'#6688aa',marginTop:8,lineHeight:1.5}}>
              You can unsubscribe at any time. We respect your privacy.
            </p>
          </div>
        </div>

        <div style={s.footerBottom}>
          <span>© 2001–2024 Python Software Foundation</span>
          <span style={{margin:'0 10px',opacity:0.4}}>|</span>
          <a href="#" onClick={e=>e.preventDefault()} style={{color:C.footerText,textDecoration:'none'}}>Legal Statements</a>
          <span style={{margin:'0 10px',opacity:0.4}}>|</span>
          <a href="#" onClick={e=>e.preventDefault()} style={{color:C.footerText,textDecoration:'none'}}>Privacy Policy</a>
          <span style={{margin:'0 10px',opacity:0.4}}>|</span>
          <span>Last updated on Apr 16, 2024</span>
          <span style={{margin:'0 10px',opacity:0.4}}>|</span>
          <span>Sphinx 7.2.6</span>
          </div>
          </footer>
        </main>

        {/* ── TOC ───────────────────────────────────────────── */}
        <aside style={s.toc}>
          {page?.toc?.length>0 && (
            <div style={{padding:'16px 14px'}}>
              <div style={{fontSize:'0.7rem',fontWeight:700,color:C.textLight,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>On This Page</div>
              {page.toc.map(t=>(
                <a key={t} href={`#${t.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`}
                  onClick={e=>e.preventDefault()}
                  style={{display:'block',fontSize:'0.78rem',color:C.link,textDecoration:'none',padding:'2px 0',lineHeight:1.6}}>{t}</a>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ─── Styles ───────────────────────────────────────────────────────── */
const s = {
  root:{display:'flex',flexDirection:'column',width:'100vw',height:'100vh',overflow:'hidden',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',background:C.bg,color:C.text,fontSize:14},
  topStrip:{background:C.headerTop,padding:'4px 0',flexShrink:0},
  topInner:{maxWidth:1400,margin:'0 auto',padding:'0 24px',display:'flex',justifyContent:'space-between',alignItems:'center'},
  header:{background:C.headerBg,borderBottom:`3px solid ${C.headerBorder}`,flexShrink:0},
  headerInner:{maxWidth:1400,margin:'0 auto',padding:'8px 24px',display:'flex',alignItems:'center',gap:8},
  headerSearch:{display:'flex',alignItems:'center',gap:7,background:'rgba(0,0,0,0.22)',border:'1px solid rgba(255,255,255,0.18)',borderRadius:5,padding:'5px 10px',marginLeft:8},
  headerSearchInput:{background:'transparent',border:'none',outline:'none',color:'#fff',fontSize:'0.82rem',width:180},
  body:{display:'flex',flex:1,overflow:'hidden'},
  sidebar:{width:232,flexShrink:0,background:C.sidebarBg,borderRight:`1px solid ${C.sidebarBorder}`,display:'flex',flexDirection:'column',overflow:'hidden'},
  sidebarSection:{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 10px',background:'transparent',border:'none',borderTop:`1px solid ${C.sidebarBorder}`,cursor:'pointer',fontSize:'0.7rem',fontWeight:700,color:C.textLight,textTransform:'uppercase',letterSpacing:'0.05em',textAlign:'left',fontFamily:'inherit'},
  sidebarItem:{display:'block',width:'100%',padding:'4px 10px 4px 14px',background:'transparent',border:'none',cursor:'pointer',fontSize:'0.81rem',textAlign:'left',lineHeight:1.65,fontFamily:'inherit',transition:'background 0.1s'},
  main:{flex:1,overflowY:'auto',background:C.bg},
  toc:{width:180,flexShrink:0,borderLeft:`1px solid ${C.border}`,overflowY:'auto',background:'#fafafa'},
  footer:{background:C.footer,color:C.footerText,borderTop:`4px solid ${C.headerBg}`,marginTop:'auto'},
  footerTop:{maxWidth:1400,margin:'0 auto',padding:'28px 24px',display:'flex',gap:32,flexWrap:'wrap'},
  footerCol:{flex:'1 1 130px',display:'flex',flexDirection:'column',gap:3},
  footerHead:{color:C.footerHead,fontWeight:700,fontSize:'0.85rem',marginBottom:6},
  footerLink:{color:C.footerText,textDecoration:'none',fontSize:'0.78rem',lineHeight:1.9},
  footerBottom:{maxWidth:1400,margin:'0 auto',borderTop:'1px solid rgba(255,255,255,0.08)',padding:'12px 24px',fontSize:'0.75rem',color:'#7a9ab8'},
  emailInput:{padding:'7px 9px',borderRadius:4,border:'1px solid rgba(255,255,255,0.18)',background:'rgba(0,0,0,0.22)',color:'#fff',fontSize:'0.8rem',outline:'none',boxSizing:'border-box'},
  emailBtn:{padding:'7px 14px',borderRadius:4,border:'none',background:'#ffd740',color:'#1a1a1a',fontWeight:700,fontSize:'0.8rem',cursor:'pointer'},
};

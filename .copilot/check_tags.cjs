const fs = require('fs');
const target = process.argv[2] || 'src/pages/auth/Signup.jsx';
const s = fs.readFileSync(target, 'utf8');
const regex = /<([a-z][a-z0-9-]*)[^>]*>|<\/([a-z][a-z0-9-]*)[^>]*>/g;
let m;
const stack = [];
const self = new Set(['img','input','br','hr','meta','path','circle','rect','line','svg','use','link','source','rect','polygon','polyline','area','col','base','embed']);
while ((m = regex.exec(s)) !== null) {
  if (m[1]) {
    const tag = m[1];
    if (!self.has(tag)) stack.push({tag,pos:m.index});
  } else if (m[2]) {
    const tag = m[2];
    const last = stack.pop();
    if (!last || last.tag !== tag) {
      console.log('Mismatch closing', tag, 'expected', last? last.tag : '<none>', 'at index', m.index);
      process.exit(0);
    }
  }
}
if (stack.length) console.log('Unclosed tag at end in', target, stack[stack.length-1]);
else console.log('Tags look balanced for lowercase HTML tags in', target);

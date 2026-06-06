const fs = require('fs');
const file = 'c:/Users/tarek/Desktop/Working on medix v2/frontend/src/screens/BillingScreen.js';
let content = fs.readFileSync(file, 'utf8');

const startIndex = content.indexOf('<ScrollView\n                    style={{ flex: 1 }}\n                    showsVerticalScrollIndicator={false}');
if(startIndex === -1) { console.log('Not found'); process.exit(1); }

// Find matching closing tag manually because of nested ScrollViews
let currentIndex = startIndex;
let depth = 0;
let endIndex = -1;
const tagRegex = /<ScrollView|<\/ScrollView>/g;
tagRegex.lastIndex = startIndex;

let match;
while ((match = tagRegex.exec(content)) !== null) {
    if (match[0].startsWith('<ScrollView')) depth++;
    else depth--;
    
    if (depth === 0) {
        endIndex = match.index + '</ScrollView>'.length;
        break;
    }
}

if (endIndex === -1) { console.log('End not found'); process.exit(1); }

const scrollContent = content.substring(startIndex, endIndex);

// Now create the variable
const funcStr = `    const renderRightPaneContent = () => (\n        ` + scrollContent.replace(/\n/g, '\n        ') + `\n    );\n`;

// Insert it before return (
content = content.replace('    return (', funcStr + '\n    return (');

// Now replace the original scrollContent with a call to renderRightPaneContent()
content = content.replace(scrollContent, '{renderRightPaneContent()}');

fs.writeFileSync(file, content);
console.log('Refactored RightPane into renderRightPaneContent()');
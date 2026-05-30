const fs = require('fs');
const path = require('path');

const indexPath = path.resolve(__dirname, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');

indexHtml = indexHtml.replace('>[-]</a>', '>-</a>');
indexHtml = indexHtml.replace('>[0]</a>', '>0</a>');
indexHtml = indexHtml.replace('>[+]</a>', '>+</a>');

indexHtml = indexHtml.replace('>[-]</button>', '>-</button>');
indexHtml = indexHtml.replace('>[0]</button>', '>0</button>');
indexHtml = indexHtml.replace('>[+]</button>', '>+</button>');

fs.writeFileSync(indexPath, indexHtml, 'utf8');
console.log("Updated index.html");

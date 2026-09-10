"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tools_1 = require("./tools");
const types_1 = require("./types");
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
async function main() {
    const args = process.argv.slice(2);
    const isJson = args.includes('--json');
    if (!isJson) {
        console.log('\n🔍 Bescane - Secure Local Dev Tool Scanner');
        console.log('==============================================\n');
    }
    const results = [];
    // To avoid IO starvation, run sequentially or in parallel?
    // We'll run in parallel since we throttled IO per-scanner in fs.ts
    const promises = tools_1.scanners.map(async (scanner) => {
        if (!isJson) {
            console.log(`[Scanning] ${scanner.name}...`);
        }
        const result = await scanner.scan();
        if (result) {
            results.push(result);
        }
    });
    await Promise.all(promises);
    if (isJson) {
        console.log(JSON.stringify(results, null, 2));
        return;
    }
    console.log('\n✅ Scan Complete. Discovered Tools:\n');
    const tableData = results.map(r => ({
        Tool: r.name,
        Version: r.version || 'Unknown',
        'Verified Path': r.isVerifiedPath ? '✅ Yes' : '⚠️ No',
        'Disk Usage': formatBytes(r.diskUsageBytes),
        Path: r.canonicalPath.length > 50 ? r.canonicalPath.substring(0, 47) + '...' : r.canonicalPath
    }));
    console.table(tableData);
}
main().catch(err => {
    console.error('Fatal Error:', err.message);
    process.exit(1);
});
//# sourceMappingURL=index.js.map
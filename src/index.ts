import { scanners } from './tools';
import { ScannedDevTool } from './types';
import { PathDiscoveryScanner } from './tools/pathDiscovery';
import { c, renderBanner, renderMetrics, renderToolCard, padVisible, formatBytes, TOOL_ICONS } from './ui';

async function main() {
  const args = process.argv.slice(2);
  const isJson = args.includes('--json');

  if (isJson) {
    const results: ScannedDevTool[] = [];
    for (const scanner of scanners) {
      const res = await scanner.scan();
      if (res) results.push(res);
    }
    // Also run PATH discovery for JSON mode
    const knownIds = new Set(results.map(r => r.id));
    const knownPaths = new Set(results.map(r => r.canonicalPath.toLowerCase()));
    results.forEach(r => knownPaths.add(require('path').dirname(r.canonicalPath).toLowerCase()));
    const discoverer = new PathDiscoveryScanner();
    const discovered = await discoverer.discover(knownIds, knownPaths);
    results.push(...discovered);
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  renderBanner();

  const scanStart = performance.now();
  console.log(`${c.bold}${c.brightWhite}Initiating Local Audit Pipeline...${c.reset}\n`);

  // ── Phase 1: Known Tool Scanners ──
  console.log(`  ${c.bold}${c.cyan}Phase 1:${c.reset} ${c.dim}Known Toolchain Registry${c.reset}\n`);

  const results: ScannedDevTool[] = [];
  let index = 1;
  const total = scanners.length;

  for (const scanner of scanners) {
    const icon = TOOL_ICONS[scanner.id] || '⚡';
    process.stdout.write(`  ${c.dim}[${index}/${total}]${c.reset} ${c.cyan}${icon} Checking ${scanner.name}...${c.reset}`);

    const t0 = performance.now();
    try {
      const result = await scanner.scan();
      const elapsed = ((performance.now() - t0) / 1000).toFixed(1);

      if (result) {
        results.push(result);
        const verStr = result.version ? `${c.bold}${c.brightGreen}${result.version}${c.reset}` : `${c.yellow}detected${c.reset}`;
        process.stdout.write(`\r\x1b[K  ${c.brightGreen}✔${c.reset} ${c.dim}[${index}/${total}]${c.reset} ${c.bold}${scanner.name}${c.reset} ${c.dim}→${c.reset} ${verStr} ${c.dim}(${formatBytes(result.diskUsageBytes)}) ${c.gray}${elapsed}s${c.reset}\n`);
      } else {
        process.stdout.write(`\r\x1b[K  ${c.gray}○${c.reset} ${c.dim}[${index}/${total}]${c.reset} ${c.gray}${scanner.name}${c.reset} ${c.dim}(not found) ${c.gray}${elapsed}s${c.reset}\n`);
      }
    } catch (e: any) {
      const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
      process.stdout.write(`\r\x1b[K  ${c.brightRed}✖${c.reset} ${c.dim}[${index}/${total}]${c.reset} ${c.gray}${scanner.name}${c.reset} ${c.red}(error) ${c.gray}${elapsed}s${c.reset}\n`);
    }
    index++;
  }

  // ── Phase 2: PATH Discovery (catches newly installed tools) ──
  console.log(`\n  ${c.bold}${c.magenta}Phase 2:${c.reset} ${c.dim}PATH Discovery (new/unknown tools)${c.reset}\n`);

  const knownIds = new Set(scanners.map(s => s.id));
  const knownPaths = new Set(results.map(r => r.canonicalPath.toLowerCase()));
  results.forEach(r => knownPaths.add(require('path').dirname(r.canonicalPath).toLowerCase()));

  const discoverer = new PathDiscoveryScanner();
  const t1 = performance.now();
  process.stdout.write(`  ${c.cyan}🔎 Scanning PATH directories...${c.reset}`);

  const discovered = await discoverer.discover(knownIds, knownPaths);
  const discoverElapsed = ((performance.now() - t1) / 1000).toFixed(1);

  if (discovered.length > 0) {
    process.stdout.write(`\r\x1b[K  ${c.brightGreen}✔${c.reset} ${c.bold}Found ${discovered.length} additional tool(s)${c.reset} ${c.gray}${discoverElapsed}s${c.reset}\n`);
    for (const d of discovered) {
      const verStr = d.version ? `${c.brightGreen}${d.version}${c.reset}` : `${c.dim}(version unknown)${c.reset}`;
      console.log(`    ${c.brightMagenta}◆${c.reset} ${c.bold}${d.name}${c.reset} ${c.dim}→${c.reset} ${verStr}`);
    }
    results.push(...discovered);
  } else {
    process.stdout.write(`\r\x1b[K  ${c.gray}○${c.reset} ${c.dim}No additional tools found on PATH${c.reset} ${c.gray}${discoverElapsed}s${c.reset}\n`);
  }

  const totalElapsed = ((performance.now() - scanStart) / 1000).toFixed(2);
  console.log(`\n${c.dim}${'─'.repeat(76)}${c.reset}`);
  console.log(`${c.dim}  Scan completed in ${c.brightCyan}${totalElapsed}s${c.reset}${c.dim} across ${total} registered + PATH discovery${c.reset}\n`);

  // Summary Metrics Bar
  renderMetrics(results);

  if (results.length === 0) {
    console.log(`${c.yellow}⚠️  No developer toolchains detected in standard locations.${c.reset}\n`);
    return;
  }

  // Render modern custom table
  console.log(`${c.bold}${c.brightWhite}Discovered Toolchains & Runtimes:${c.reset}\n`);

  const colToolW = 26;
  const colVerW = 16;
  const colSizeW = 14;
  const colIntegrityW = 16;

  const th1 = padVisible(` ${c.bold}${c.cyan}Tool${c.reset}`, colToolW);
  const th2 = padVisible(` ${c.bold}${c.cyan}Version${c.reset}`, colVerW);
  const th3 = padVisible(` ${c.bold}${c.cyan}Disk Usage${c.reset}`, colSizeW);
  const th4 = padVisible(` ${c.bold}${c.cyan}Integrity${c.reset}`, colIntegrityW);

  console.log(`${c.dim}┌${'─'.repeat(colToolW)}┬${'─'.repeat(colVerW)}┬${'─'.repeat(colSizeW)}┬${'─'.repeat(colIntegrityW)}┐${c.reset}`);
  console.log(`${c.dim}│${c.reset}${th1}${c.dim}│${c.reset}${th2}${c.dim}│${c.reset}${th3}${c.dim}│${c.reset}${th4}${c.dim}│${c.reset}`);
  console.log(`${c.dim}├${'─'.repeat(colToolW)}┼${'─'.repeat(colVerW)}┼${'─'.repeat(colSizeW)}┼${'─'.repeat(colIntegrityW)}┤${c.reset}`);

  for (const r of results) {
    const icon = TOOL_ICONS[r.id] || (r.id.startsWith('discovered:') ? '◆' : '⚡');
    const toolName = padVisible(` ${icon} ${c.bold}${r.name}${c.reset}`, colToolW);
    const verText = padVisible(` ${c.brightGreen}${r.version || 'Unknown'}${c.reset}`, colVerW);
    const sizeStr = r.diskUsageBytes > 0 ? formatBytes(r.diskUsageBytes) : '—';
    const sizeText = padVisible(` ${c.brightYellow}${sizeStr}${c.reset}`, colSizeW);
    const statusText = padVisible(` ${r.isVerifiedPath ? c.brightGreen + '✔ Verified' : c.brightRed + '⚠️ Untrusted'}${c.reset}`, colIntegrityW);

    console.log(`${c.dim}│${c.reset}${toolName}${c.dim}│${c.reset}${verText}${c.dim}│${c.reset}${sizeText}${c.dim}│${c.reset}${statusText}${c.dim}│${c.reset}`);
  }

  console.log(`${c.dim}└${'─'.repeat(colToolW)}┴${'─'.repeat(colVerW)}┴${'─'.repeat(colSizeW)}┴${'─'.repeat(colIntegrityW)}┘${c.reset}\n`);

  // Detailed Tool breakdown cards (only for known tools with size data)
  const detailedTools = results.filter(r => r.diskUsageBytes > 0);
  if (detailedTools.length > 0) {
    console.log(`${c.bold}${c.brightWhite}Storage & Cache Details:${c.reset}\n`);
    for (const r of detailedTools) {
      renderToolCard(r);
    }
  }

  console.log(`${c.dim}🛡️  Scan completed locally. No telemetry sent. Safe sandbox execution.${c.reset}\n`);
}

main().catch(err => {
  console.error(c.brightRed + 'Fatal Error:' + c.reset, err.message);
  process.exit(1);
});

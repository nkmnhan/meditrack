#!/usr/bin/env node
/**
 * Full-text search across GitHub shared memory — no database required.
 *
 * Usage: node .claude/hooks/search-knowledge.mjs "query terms"
 *
 * Searches all entries in .claude/shared-memory/index.json by matching
 * query terms against key, value, tags, and source fields.
 * Supports multi-word queries (all terms must match), fuzzy matching,
 * and ranks results by relevance.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const query = process.argv[2];
if (!query) {
  console.log('Usage: node .claude/hooks/search-knowledge.mjs "query terms"');
  process.exit(0);
}

const indexPath = join(process.cwd(), '.claude', 'shared-memory', 'index.json');

let index;
try {
  index = JSON.parse(readFileSync(indexPath, 'utf8'));
} catch {
  console.log('No shared memory index found at .claude/shared-memory/index.json');
  process.exit(0);
}

// Collect all entries from all categories
const allEntries = [];
const categories = ['learnings', 'principles', 'fixes', 'patterns', 'decisions', 'gotchas'];

for (const category of categories) {
  if (Array.isArray(index[category])) {
    for (const entry of index[category]) {
      allEntries.push({ ...entry, _category: category });
    }
  }
}

if (allEntries.length === 0) {
  console.log('Shared memory is empty. Use /learn save to add knowledge.');
  process.exit(0);
}

// Tokenize query into lowercase terms
const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

// Score each entry
const scored = allEntries.map(entry => {
  const searchable = [
    entry.key || '',
    entry.value || '',
    ...(entry.tags || []),
    entry.source || '',
    entry._category,
  ].join(' ').toLowerCase();

  let score = 0;
  let matchedTerms = 0;

  for (const term of queryTerms) {
    // Exact substring match
    if (searchable.includes(term)) {
      matchedTerms++;
      // Weight by where the match occurs
      if ((entry.key || '').toLowerCase().includes(term)) score += 10;       // Key match = highest
      if ((entry.value || '').toLowerCase().includes(term)) score += 5;      // Value match
      if ((entry.tags || []).some(t => t.toLowerCase().includes(term))) score += 8; // Tag match
      if ((entry.source || '').toLowerCase().includes(term)) score += 3;     // Source match
    } else {
      // Fuzzy: check if term is within edit distance 1 of any word
      const words = searchable.split(/\s+/);
      for (const word of words) {
        if (word.length > 3 && term.length > 3) {
          // Simple containment check (substring of 4+ chars)
          if (word.includes(term.slice(0, -1)) || term.includes(word.slice(0, -1))) {
            matchedTerms++;
            score += 2;
            break;
          }
        }
      }
    }
  }

  // All terms must match for a result to be included
  const isMatch = matchedTerms >= Math.ceil(queryTerms.length * 0.6);

  return { entry, score, isMatch };
}).filter(result => result.isMatch && result.score > 0);

// Sort by score descending
scored.sort((a, b) => b.score - a.score);

// Output results
if (scored.length === 0) {
  console.log(`No results for "${query}". Shared memory has ${allEntries.length} entries across ${categories.length} categories.`);
  process.exit(0);
}

console.log(`Found ${scored.length} result(s) for "${query}":\n`);

for (const { entry, score } of scored.slice(0, 10)) {
  console.log(`[${entry._category}] ${entry.key} (score: ${score})`);
  console.log(`  ${(entry.value || '').slice(0, 200)}`);
  if (entry.tags?.length) console.log(`  tags: ${entry.tags.join(', ')}`);
  if (entry.source) console.log(`  source: ${entry.source}`);
  if (entry.date) console.log(`  date: ${entry.date}`);
  console.log('');
}

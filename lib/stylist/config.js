export function boundedInt(value,fallback,min,max) {
  const number=value === undefined || value === '' ? NaN : Number(value);return Number.isInteger(number)&&number>=min&&number<=max?number:fallback;
}
export function stylistConfig(env=process.env) {
  return {
    defaultModel:env.OPENAI_DEFAULT_MODEL || 'gpt-5.6-luna',
    advancedModel:env.OPENAI_ADVANCED_MODEL || 'gpt-5.6-terra',
    advancedEnabled:env.AX_STYLIST_ADVANCED_ENABLED !== 'false',
    advancedThreshold:boundedInt(env.AX_STYLIST_ADVANCED_THRESHOLD,4,2,10),
    advancedDailyLimit:boundedInt(env.AX_STYLIST_ADVANCED_DAILY_LIMIT,15,0,1000),
    mediumThreshold:boundedInt(env.AX_STYLIST_MEDIUM_THRESHOLD,8,6,15),
    maxOutputTokens:boundedInt(env.AX_STYLIST_MAX_OUTPUT_TOKENS,1000,300,2400),
    advancedOutputTokens:boundedInt(env.AX_STYLIST_ADVANCED_OUTPUT_TOKENS,2000,600,4000),
    maxContextMessages:boundedInt(env.AX_STYLIST_CONTEXT_MESSAGES,6,2,10),
    maxContextChars:boundedInt(env.AX_STYLIST_CONTEXT_CHARS,4800,1200,10000),
    maxModelCalls:boundedInt(env.AX_STYLIST_MAX_MODEL_CALLS,6,3,8),
    maxToolCalls:boundedInt(env.AX_STYLIST_MAX_TOOL_CALLS,6,2,10),
    searchResults:boundedInt(env.AX_STYLIST_SEARCH_RESULTS,6,2,10),
    maxToolChars:boundedInt(env.AX_STYLIST_TOOL_CONTEXT_CHARS,9000,3000,14000),
    usageEnabled:env.AX_STYLIST_USAGE_ENABLED !== 'false'
  };
}

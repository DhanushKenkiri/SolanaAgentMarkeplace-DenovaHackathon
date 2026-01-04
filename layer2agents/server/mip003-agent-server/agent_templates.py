"""
Example Agent Templates
=======================
Copy and customize these agent configurations for different use cases.
Replace the get_agent_input_schema() and execute_agent_task() functions
in main.py with these examples.
"""

# =============================================================================
# EXAMPLE 1: Content Writer Agent
# =============================================================================

def content_writer_schema():
    """Schema for a content writing agent."""
    return [
        {
            "name": "topic",
            "type": "string",
            "description": "The topic to write about",
            "required": True,
        },
        {
            "name": "content_type",
            "type": "option",
            "description": "Type of content to generate",
            "required": True,
            "data": {"options": ["blog_post", "article", "social_media", "email", "product_description"]},
        },
        {
            "name": "tone",
            "type": "option",
            "description": "Writing tone",
            "required": False,
            "data": {"options": ["professional", "casual", "friendly", "formal", "persuasive"]},
        },
        {
            "name": "word_count",
            "type": "number",
            "description": "Target word count (100-5000)",
            "required": False,
            "data": {"min": 100, "max": 5000, "default": 500},
        },
        {
            "name": "keywords",
            "type": "string",
            "description": "SEO keywords to include (comma-separated)",
            "required": False,
        },
        {
            "name": "target_audience",
            "type": "string",
            "description": "Who is the content for?",
            "required": False,
        },
    ]


CONTENT_WRITER_PROMPT = """You are a professional content writer with expertise in:
- Blog posts and articles
- Social media content
- Email marketing
- Product descriptions
- SEO optimization

Guidelines:
1. Write engaging, well-structured content
2. Match the requested tone and style
3. Include relevant keywords naturally
4. Target the specified audience
5. Meet the word count requirements

Always deliver polished, ready-to-publish content."""


# =============================================================================
# EXAMPLE 2: Code Review Agent
# =============================================================================

def code_review_schema():
    """Schema for a code review agent."""
    return [
        {
            "name": "code",
            "type": "string",
            "description": "The code to review",
            "required": True,
        },
        {
            "name": "language",
            "type": "option",
            "description": "Programming language",
            "required": True,
            "data": {"options": ["python", "javascript", "typescript", "rust", "go", "java", "other"]},
        },
        {
            "name": "review_focus",
            "type": "option",
            "description": "What to focus the review on",
            "required": False,
            "data": {"options": ["security", "performance", "readability", "best_practices", "all"]},
        },
        {
            "name": "severity_level",
            "type": "option",
            "description": "Minimum severity to report",
            "required": False,
            "data": {"options": ["critical", "high", "medium", "low", "all"]},
        },
        {
            "name": "include_suggestions",
            "type": "boolean",
            "description": "Include code improvement suggestions",
            "required": False,
        },
    ]


CODE_REVIEW_PROMPT = """You are an expert code reviewer with deep knowledge of:
- Security vulnerabilities and best practices
- Performance optimization
- Code readability and maintainability
- Design patterns and architecture
- Language-specific idioms

For each review:
1. Analyze the code thoroughly
2. Identify issues with severity levels
3. Explain why each issue matters
4. Provide concrete suggestions for improvement
5. Highlight any positive patterns used

Format your review with clear sections:
- Summary
- Critical Issues
- Warnings
- Suggestions
- Positive Patterns"""


# =============================================================================
# EXAMPLE 3: Research Assistant Agent
# =============================================================================

def research_assistant_schema():
    """Schema for a research assistant agent."""
    return [
        {
            "name": "research_question",
            "type": "string",
            "description": "The main question or topic to research",
            "required": True,
        },
        {
            "name": "depth",
            "type": "option",
            "description": "How deep should the research go",
            "required": False,
            "data": {"options": ["overview", "detailed", "comprehensive"]},
        },
        {
            "name": "sources_preference",
            "type": "option",
            "description": "Preferred type of sources",
            "required": False,
            "data": {"options": ["academic", "industry", "news", "mixed"]},
        },
        {
            "name": "time_period",
            "type": "option",
            "description": "Time period for research",
            "required": False,
            "data": {"options": ["last_month", "last_year", "last_5_years", "all_time"]},
        },
        {
            "name": "output_format",
            "type": "option",
            "description": "How to format the results",
            "required": False,
            "data": {"options": ["summary", "report", "bullet_points", "annotated_bibliography"]},
        },
    ]


RESEARCH_ASSISTANT_PROMPT = """You are a professional research assistant with expertise in:
- Academic research methodology
- Industry analysis
- Data synthesis and summarization
- Critical evaluation of sources
- Clear, structured reporting

For each research task:
1. Break down the question into key components
2. Provide relevant information with context
3. Cite sources where applicable
4. Present multiple perspectives when relevant
5. Draw clear conclusions based on evidence

Always maintain objectivity and acknowledge limitations in available information."""


# =============================================================================
# EXAMPLE 4: Data Analysis Agent
# =============================================================================

def data_analysis_schema():
    """Schema for a data analysis agent."""
    return [
        {
            "name": "data",
            "type": "string",
            "description": "The data to analyze (CSV format, JSON, or description)",
            "required": True,
        },
        {
            "name": "analysis_type",
            "type": "option",
            "description": "Type of analysis to perform",
            "required": True,
            "data": {"options": ["descriptive", "trend", "comparison", "anomaly", "prediction"]},
        },
        {
            "name": "questions",
            "type": "string",
            "description": "Specific questions to answer about the data",
            "required": False,
        },
        {
            "name": "visualization",
            "type": "boolean",
            "description": "Include visualization recommendations",
            "required": False,
        },
        {
            "name": "export_format",
            "type": "option",
            "description": "Preferred export format for results",
            "required": False,
            "data": {"options": ["text", "json", "markdown", "html"]},
        },
    ]


DATA_ANALYSIS_PROMPT = """You are an expert data analyst with skills in:
- Statistical analysis
- Trend identification
- Pattern recognition
- Data visualization recommendations
- Insight generation

For each analysis:
1. Understand the data structure and context
2. Apply appropriate analytical methods
3. Identify key patterns and insights
4. Provide clear, actionable conclusions
5. Recommend visualizations when helpful

Present findings in a clear, structured format with supporting evidence."""


# =============================================================================
# EXAMPLE 5: Customer Support Agent
# =============================================================================

def customer_support_schema():
    """Schema for a customer support agent."""
    return [
        {
            "name": "customer_message",
            "type": "string",
            "description": "The customer's message or inquiry",
            "required": True,
        },
        {
            "name": "product_context",
            "type": "string",
            "description": "Product or service being discussed",
            "required": False,
        },
        {
            "name": "customer_history",
            "type": "string",
            "description": "Previous interaction history (if any)",
            "required": False,
        },
        {
            "name": "urgency",
            "type": "option",
            "description": "Issue urgency level",
            "required": False,
            "data": {"options": ["low", "medium", "high", "critical"]},
        },
        {
            "name": "response_tone",
            "type": "option",
            "description": "Desired response tone",
            "required": False,
            "data": {"options": ["empathetic", "professional", "friendly", "formal"]},
        },
        {
            "name": "include_next_steps",
            "type": "boolean",
            "description": "Include clear next steps in response",
            "required": False,
        },
    ]


CUSTOMER_SUPPORT_PROMPT = """You are an expert customer support representative with skills in:
- Problem resolution
- Clear communication
- Empathy and understanding
- Product knowledge
- De-escalation techniques

For each customer interaction:
1. Acknowledge the customer's concern
2. Ask clarifying questions if needed
3. Provide accurate, helpful information
4. Offer solutions or alternatives
5. Include clear next steps

Always maintain a professional, helpful tone while being efficient and thorough."""


# =============================================================================
# How to use these templates:
# =============================================================================
"""
1. Choose a template that matches your use case
2. Copy the schema function to main.py (rename to get_agent_input_schema)
3. Copy the system prompt constant
4. Update execute_agent_task() to use the system prompt
5. Customize as needed

Example update in main.py:

```python
def create_swarms_agent():
    from swarms import Agent
    
    return Agent(
        agent_name=AGENT_NAME,
        system_prompt=CONTENT_WRITER_PROMPT,  # Use the template prompt
        model_name=MODEL_NAME,
        max_loops=1,
    )

def get_agent_input_schema():
    return content_writer_schema()  # Use the template schema
```
"""

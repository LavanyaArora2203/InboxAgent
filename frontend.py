import streamlit as st

st.set_page_config(page_title="Calculator", page_icon="🧮")
st.title("🧮 Simple Calculator")

# Initialize session state for expression
if "expression" not in st.session_state:
    st.session_state.expression = ""

def press(value):
    st.session_state.expression += str(value)

def clear():
    st.session_state.expression = ""

def backspace():
    st.session_state.expression = st.session_state.expression[:-1]

def calculate():
    try:
        # Only allow safe characters
        allowed = "0123456789+-*/(). "
        expr = st.session_state.expression
        if all(c in allowed for c in expr) and expr.strip():
            st.session_state.expression = str(eval(expr))
        else:
            st.session_state.expression = "Error"
    except Exception:
        st.session_state.expression = "Error"

# Display
st.text_input("Result", value=st.session_state.expression, key="display", disabled=True)

# Button layout
buttons = [
    ["7", "8", "9", "/"],
    ["4", "5", "6", "*"],
    ["1", "2", "3", "-"],
    ["0", ".", "C", "+"],
]

for row in buttons:
    cols = st.columns(4)
    for col, btn in zip(cols, row):
        if btn == "C":
            col.button(btn, on_click=clear, use_container_width=True)
        else:
            col.button(btn, on_click=press, args=(btn,), use_container_width=True)

col1, col2 = st.columns(2)
col1.button("⌫ Backspace", on_click=backspace, use_container_width=True)
col2.button("= Calculate", on_click=calculate, use_container_width=True, type="primary")
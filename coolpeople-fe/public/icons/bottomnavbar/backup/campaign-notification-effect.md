# Campaign Notification Effect

This effect shows when there's a ballot to fill out (user is NOT on the MyBallot page).

## Behavior
- Red gradient balls spin fast for 1 second with subtle glow
- Glow fades out, leaving static red balls
- When user clicks and goes to MyBallot, reverts to normal light/dark mode icons

## Implementation (in BottomNav.jsx)
```jsx
{isCampaignAnimated ? (
  <div className="campaign-balls-container">
    <div className="ball-wrapper ball-big">
      <div className="ball-inner"></div>
    </div>
    <div className="ball-wrapper ball-small-1">
      <div className="ball-inner"></div>
    </div>
    <div className="ball-wrapper ball-small-2">
      <div className="ball-inner"></div>
    </div>
  </div>
) : (
  // Regular icon from public folder
)}
```

## CSS (in BottomNav.css)
```css
.campaign-balls-container {
  position: relative;
  width: 24px;
  height: 24px;
}

.ball-wrapper {
  position: absolute;
  border-radius: 50%;
  animation: spinFast 1s ease-in-out forwards, glowPulse 1s ease-in-out forwards;
}

.ball-wrapper .ball-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF6B6B 0%, #E12D39 50%, #8B0000 100%);
}

.ball-wrapper.ball-big {
  width: 10px;
  height: 10px;
  top: 2px;
  left: 4px;
}

.ball-wrapper.ball-small-1 {
  width: 5px;
  height: 5px;
  top: 8px;
  left: 15px;
}

.ball-wrapper.ball-small-2 {
  width: 5px;
  height: 5px;
  top: 15px;
  left: 6px;
}

@keyframes spinFast {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(3600deg); }
}

@keyframes glowPulse {
  0% { box-shadow: 0 0 1px 1px rgba(225, 45, 57, 0.3); }
  25% { box-shadow: 0 0 2px 1px rgba(255, 107, 107, 0.25); }
  50% { box-shadow: 0 0 3px 1px rgba(225, 45, 57, 0.3); }
  75% { box-shadow: 0 0 2px 1px rgba(255, 107, 107, 0.2); }
  90% { box-shadow: 0 0 1px 0px rgba(225, 45, 57, 0.1); }
  100% { box-shadow: 0 0 0 0 transparent; }
}
```

## Condition
```jsx
const isCampaignAnimated = item.id === 'campaign' && !isActive && !isBallot
```
- Shows animated red balls when: campaign icon + NOT on campaign page + NOT ballot theme
- Shows regular icon when: on campaign page OR in ballot theme

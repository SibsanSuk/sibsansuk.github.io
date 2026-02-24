# บทที่ 03
## Unity Input System: จาก Jump เดียว ไปสู่ Move แบบ Vector2
Game Design and Development @ Faculty of Science, Silpakorn University

---
## เป้าหมายของบทนี้
- เข้าใจเหตุผลที่เกมสมัยใหม่ต้องมี `Input System` เป็น layer
- สร้าง `Input Action` แบบง่ายที่สุด โดยเริ่มจาก `Jump` อย่างเดียว
- ทำทรงกลมกระโดดได้ ด้วยโค้ดที่แยกหน้าที่ตาม `SOLID`
- เพิ่ม `Move` แบบ `Vector2 composite` เพื่อควบคุม 2 แกน

---
## โครงสร้างคาบ
1. เหตุผลของ `Input System` และหน้า `Settings`
2. Step 1: สร้าง `Input Action` ชื่อ `Jump`
3. Step 2: Implement ทรงกลมกระโดด
4. Step 3: เพิ่ม `Move` แบบ `Vector2 composite`
5. Activity และงานส่ง

---
## ทำไมเกมต้องมี Input System Layer
เกมจริงไม่ได้รับ input จากอุปกรณ์เดียว
- ผู้เล่นใช้ได้ทั้ง keyboard, mouse, joystick, gamepad, และอุปกรณ์อื่น
- แต่ละแพลตฟอร์มมี mapping ต่างกัน
- ผู้เล่นคาดหวังให้เกมเปลี่ยนปุ่มได้ในหน้า settings

แนวคิดสำคัญ:
- เกมอ่านที่ระดับ `Action` เช่น Jump, Move, Interact
- ระบบ input รับผิดชอบ mapping จากอุปกรณ์เข้าสู่ action

---
## Input Layer กับ Gameplay Layer
- `Input Layer`: แปลสัญญาณอุปกรณ์ เป็น action ของเกม
- `Gameplay Layer`: ตัดสินใจพฤติกรรม เช่น กระโดด, เดิน, โต้ตอบ

[Tips] แยกสองชั้นนี้ให้ชัดตั้งแต่ต้น จะขยายระบบได้ง่ายกว่าแก้โค้ด hardcode ภายหลัง

---
## Settings ที่เกมควรมี
ตัวอย่างในเกมจริง:
- เปลี่ยนปุ่ม `Jump`
- ปรับ sensitivity ของแกนเคลื่อนที่
- สลับ preset ระหว่าง keyboard และ gamepad

สิ่งที่เกิดขึ้นเบื้องหลัง:
- แก้ binding ของ `Input Action`
- เก็บค่าที่ผู้เล่นตั้งไว้ แล้วโหลดกลับครั้งถัดไป

---
## Step 1: เตรียม Input Action Asset
ขั้นตอน:
1. สร้าง `Input Actions` asset ชื่อ `PlayerControls`
2. สร้าง `Action Map` ชื่อ `Player`
3. เพิ่ม action `Jump` ตั้งชนิดเป็น `Button`
4. ใส่ binding อย่างน้อย 2 อุปกรณ์

ตัวอย่าง binding:
- Keyboard: `Space`
- Gamepad: `Button South`

---
## ภาพรวม Scene สำหรับ Step 1
- `Ground` เป็นพื้น (มี collider)
- `PlayerSphere` เป็นทรงกลม (มี `Rigidbody` + collider)
- `PlayerSphere` ติด script อ่าน input และ script กระโดด

[Tips] แยก script อ่าน input ออกจาก script สั่งฟิสิกส์ เพื่อรักษา `Single Responsibility`

---
## Interface สำหรับ Jump Input
<pre style="height: 44vh; overflow:auto;"><code class="language-csharp">public interface IJumpInput
{
    bool ConsumeJump();
}
</code></pre>

หลักคิด:
- ชั้นฟิสิกส์ไม่สนใจว่า input มาจากอุปกรณ์อะไร
- ขอเพียง contract ว่ามีคำสั่งกระโดดหรือไม่

---
## Script อ่าน Jump จาก Input System
<pre style="height: 58vh; overflow:auto;"><code class="language-csharp">using UnityEngine;
using UnityEngine.InputSystem;

public class JumpActionInput : MonoBehaviour, IJumpInput
{
    [SerializeField] private InputActionReference jumpAction;
    private bool jumpRequested;

    private void OnEnable()
    {
        if (jumpAction == null || jumpAction.action == null) return;
        jumpAction.action.performed += OnJumpPerformed;
        jumpAction.action.Enable();
    }

    private void OnDisable()
    {
        if (jumpAction == null || jumpAction.action == null) return;
        jumpAction.action.performed -= OnJumpPerformed;
        jumpAction.action.Disable();
    }

    private void OnJumpPerformed(InputAction.CallbackContext context)
    {
        jumpRequested = true;
    }

    public bool ConsumeJump()
    {
        if (!jumpRequested) return false;
        jumpRequested = false;
        return true;
    }
}
</code></pre>

---
## Script สั่งกระโดดด้วยฟิสิกส์
<pre style="height: 58vh; overflow:auto;"><code class="language-csharp">using UnityEngine;

[RequireComponent(typeof(Rigidbody))]
public class JumpMotor : MonoBehaviour
{
    [SerializeField] private float jumpImpulse = 6f;
    [SerializeField] private MonoBehaviour jumpInputSource;

    private Rigidbody body;
    private IJumpInput jumpInput;

    private void Awake()
    {
        body = GetComponent<Rigidbody>();
        jumpInput = jumpInputSource as IJumpInput;
    }

    private void FixedUpdate()
    {
        if (jumpInput == null) return;
        if (!jumpInput.ConsumeJump()) return;

        body.AddForce(Vector3.up * jumpImpulse, ForceMode.Impulse);
    }
}
</code></pre>

---
## วิเคราะห์ Step 1
- `JumpActionInput` รับผิดชอบเฉพาะ input event
- `JumpMotor` รับผิดชอบเฉพาะ physics
- สั่งแรงใน `FixedUpdate()` ให้เข้าจังหวะ simulation
- โครงสร้างนี้รองรับการเปลี่ยนอุปกรณ์ โดยไม่ต้องแก้ logic กระโดด

---
## Activity 1: Jump Only
[mode:activity]
โจทย์:
1. ทำทรงกลมกระโดดได้จาก `Jump` action
2. ทดสอบอย่างน้อย 2 binding เช่น keyboard และ gamepad
3. ปรับ `jumpImpulse` 3 ค่า แล้วบันทึกผล

สิ่งที่ส่ง:
- วิดีโอสั้นผลการทดสอบ
- ตารางค่า impulse และความรู้สึกที่ได้

---
## Step 2: เพิ่ม Move แบบ Vector2 Composite
แนวคิด:
- `Move` เป็น action ชนิด `Value`, control type เป็น `Vector2`
- ใช้ `2D Vector Composite` เพื่อรวมหลายปุ่มเป็นแกน X, Y

ตัวอย่าง keyboard mapping:
- Up: W
- Down: S
- Left: A
- Right: D

ตัวอย่าง gamepad mapping:
- Left Stick

---
## Script อ่าน Move
<pre style="height: 58vh; overflow:auto;"><code class="language-csharp">using UnityEngine;
using UnityEngine.InputSystem;

public interface IMoveInput
{
    Vector2 ReadMove();
}

public class MoveActionInput : MonoBehaviour, IMoveInput
{
    [SerializeField] private InputActionReference moveAction;

    private void OnEnable()
    {
        if (moveAction == null || moveAction.action == null) return;
        moveAction.action.Enable();
    }

    private void OnDisable()
    {
        if (moveAction == null || moveAction.action == null) return;
        moveAction.action.Disable();
    }

    public Vector2 ReadMove()
    {
        if (moveAction == null || moveAction.action == null) return Vector2.zero;
        return moveAction.action.ReadValue<Vector2>();
    }
}
</code></pre>

---
## Script เคลื่อนที่ด้วย Move Vector2
<pre style="height: 58vh; overflow:auto;"><code class="language-csharp">using UnityEngine;

[RequireComponent(typeof(Rigidbody))]
public class MoveMotor : MonoBehaviour
{
    [SerializeField] private float moveSpeed = 5f;
    [SerializeField] private MonoBehaviour moveInputSource;

    private Rigidbody body;
    private IMoveInput moveInput;

    private void Awake()
    {
        body = GetComponent<Rigidbody>();
        moveInput = moveInputSource as IMoveInput;
    }

    private void FixedUpdate()
    {
        if (moveInput == null) return;

        Vector2 move = moveInput.ReadMove();
        Vector3 velocity = new Vector3(move.x * moveSpeed, body.velocity.y, move.y * moveSpeed);
        body.velocity = velocity;
    }
}
</code></pre>

---
## จุดที่ต้องเน้นตอนสอน Step 2
- Composite ทำให้ผู้เรียนเห็นว่า 4 ปุ่มรวมเป็น 1 ค่า `Vector2`
- keyboard และ gamepad ให้ค่าเข้า action เดียวกันได้
- gameplay code อ่านค่าเดียว ไม่สนใจแหล่งที่มาของอุปกรณ์

[Tips] ถ้าค่าทิศทางกลับด้าน ให้เช็ค binding ของแกน `Up`, `Down`, `Left`, `Right` ก่อนแก้โค้ด

---
## Activity 2: Jump + Move
[mode:activity]
โจทย์:
1. รวมระบบ `Jump` และ `Move` ให้ใช้ได้พร้อมกัน
2. ทดสอบ movement 8 ทิศทางจาก `Vector2 composite`
3. สลับใช้งาน keyboard และ gamepad ในฉากเดียวกัน

สิ่งที่ส่ง:
- วิดีโอทดสอบการควบคุม
- สรุปปัญหา 1 ข้อ และวิธีแก้

---
## Step 4: Character Control + Physics Interaction
เมื่อคุมตัวละครได้แล้ว ขั้นถัดไปคือการโต้ตอบกับวัตถุที่มีฟิสิกส์
- ตัวละครชนวัตถุแล้ววัตถุปลิวได้
- อ่านค่าการชนเพื่อนำไปทำระบบเกม เช่น damage, hit reaction, sound
- แยกกรณีชนแบบทึบ กับชนแบบตรวจเหตุการณ์

---
## Collision Data ที่ใช้บ่อย
เมื่อเกิด `OnCollisionEnter` เราอ่านข้อมูลสำคัญได้ เช่น
- `collision.relativeVelocity` ความเร็วสัมพัทธ์ขณะชน
- `collision.impulse` แรงกระแทกรวมของการชน
- `collision.contacts` จุดสัมผัส

นำไปใช้ได้กับ:
- คำนวณความแรงของการชน
- ตัดสินใจเล่น SFX, VFX ตามระดับ impact
- แยกชนเบา, ชนหนัก เพื่อเปลี่ยนผลลัพธ์เกม

---
## ตัวอย่าง: อ่าน Impact และ Relative Velocity
<pre style="height: 58vh; overflow:auto;"><code class="language-csharp">using UnityEngine;

public class CollisionImpactReporter : MonoBehaviour
{
    [SerializeField] private float heavyHitThreshold = 6f;

    private void OnCollisionEnter(Collision collision)
    {
        float relativeSpeed = collision.relativeVelocity.magnitude;
        float impulse = collision.impulse.magnitude;

        Debug.Log($\"Hit {collision.gameObject.name}\");
        Debug.Log($\"Relative Speed: {relativeSpeed:F2}\");
        Debug.Log($\"Impulse: {impulse:F2}\");

        if (relativeSpeed >= heavyHitThreshold)
            Debug.Log(\"Heavy Impact\");
        else
            Debug.Log(\"Light Impact\");
    }
}
</code></pre>

---
## Trigger คืออะไร
`Trigger` คือ collider ที่ใช้ตรวจเหตุการณ์โดยไม่ผลักวัตถุ
- เปิด `Is Trigger` ที่ collider
- รับ event ผ่าน `OnTriggerEnter`, `OnTriggerExit`
- เหมาะกับ pickup, checkpoint, zone, sensor

---
## ตัวอย่าง: เปลี่ยนจาก Collision เป็น Trigger
<pre style="height: 56vh; overflow:auto;"><code class="language-csharp">using UnityEngine;

public class PickupTrigger : MonoBehaviour
{
    private void OnTriggerEnter(Collider other)
    {
        if (!other.CompareTag(\"Player\")) return;

        Debug.Log(\"Pickup Collected\");
        gameObject.SetActive(false);
    }
}
</code></pre>

สิ่งที่ต้องสังเกต:
- วัตถุไม่ถูกผลักออกเหมือน collision แบบทึบ
- ใช้ตรวจผ่านและเรียก logic ได้แม่น

---
## Collision กับ Trigger เลือกอย่างไร
- ใช้ `Collision` เมื่ออยากได้แรงชนจริง, การเด้ง, การผลัก, และข้อมูล contact
- ใช้ `Trigger` เมื่ออยากตรวจผ่านพื้นที่หรือเก็บไอเท็ม โดยไม่ต้องเกิดแรงชน

[Tips] คิดจากเป้าหมาย gameplay ก่อนเสมอ แล้วค่อยเลือกชนิด collider

---
## Case Study: เหรียญในเกมแนววิ่ง
โจทย์อภิปราย:
1. เหรียญใน `Subway Surfers` ควรเป็น `Collision` หรือ `Trigger`
2. วงแหวนใน `Sonic` ควรเป็น `Collision` หรือ `Trigger`
3. ถ้าเลือกแบบผิด จะเกิดอาการแปลกอะไรกับประสบการณ์เล่น

แนวตอบที่คาดหวัง:
- ไอเท็มเก็บสะสมส่วนใหญ่ควรใช้ `Trigger`
- เพราะต้องเก็บได้ทันที, ไม่ผลักผู้เล่น, และไม่รบกวน movement

---
## Activity 3: Collision vs Trigger Lab
[mode:activity]
โจทย์:
1. สร้าง physics object 2 ชิ้นให้ชนกัน แล้ว log `relativeVelocity`, `impulse`
2. เปลี่ยน collider ของไอเท็มอีกชิ้นเป็น `Is Trigger`
3. ทดสอบความต่างของพฤติกรรมก่อนและหลังเปลี่ยน
4. สรุปผลว่าเหตุการณ์ใดเหมาะใช้ `Collision`, เหตุการณ์ใดเหมาะใช้ `Trigger`

สิ่งที่ส่ง:
- วิดีโอเปรียบเทียบ collision และ trigger
- ตารางสรุปอย่างน้อย 4 กรณีใช้งานในเกม

---
## Step 5: ตัวอย่างระบบคะแนนจาก Tag
แนวคิด:
- ใช้ `tag` เพื่อบอกประเภทวัตถุ เช่น `Coin`, `Enemy`
- ให้ตัวละครรับ event ตอนชนหรือเข้า trigger
- อัปเดตคะแนนตามกติกาที่กำหนด

ตัวอย่างกติกา:
- ชน `Coin` ได้ +10 คะแนน
- ชน `Enemy` โดน -20 คะแนน

---
## Script ตัวอย่าง: Score by Tag
<pre style="height: 58vh; overflow:auto;"><code class="language-csharp">using UnityEngine;

public class ScoreByTag : MonoBehaviour
{
    [SerializeField] private int score;
    [SerializeField] private int coinScore = 10;
    [SerializeField] private int enemyPenalty = 20;

    private void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Coin"))
        {
            score += coinScore;
            Debug.Log($"Coin +{coinScore} => Score: {score}");
            other.gameObject.SetActive(false);
            return;
        }

        if (other.CompareTag("Enemy"))
        {
            score -= enemyPenalty;
            Debug.Log($"Enemy -{enemyPenalty} => Score: {score}");
        }
    }
}
</code></pre>

---
## เอาไปเล่นกับกติกาเกมอย่างไร
ตัวอย่างต่อยอด:
- เก็บครบ 10 เหรียญ ปลดล็อกประตู
- คะแนนต่ำกว่า 0 ให้แพ้ทันที
- ชนศัตรูต่อเนื่อง 3 ครั้ง ตัดแต้มโบนัส
- คะแนนถึงเป้าในเวลาที่กำหนด ถือว่าชนะ

[Tips] แยกกติกาคะแนนออกจาก script เคลื่อนที่ เพื่อปรับบาลานซ์ได้เร็วและไม่กระทบระบบ control

---
## Activity 4: Score Rule Prototype
[mode:activity]
โจทย์:
1. ทำวัตถุอย่างน้อย 2 tag คือ `Coin` และ `Enemy`
2. เขียนกติกาคะแนนอย่างน้อย 3 ข้อ
3. แสดงคะแนนปัจจุบันใน Console หรือ UI
4. สร้างเงื่อนไขชนะหรือแพ้จากคะแนน

สิ่งที่ส่ง:
- วิดีโอสาธิตกติกาที่ทำ
- ตารางกติกา: เหตุการณ์, ผลคะแนน, ผลต่อสถานะเกม

---
## หน้า Settings เบื้องต้นในคาบนี้
สิ่งที่ให้สาธิต:
- ปุ่มเปลี่ยน binding ของ `Jump`
- แสดงข้อความ current binding เช่น Space, Button South

สิ่งที่ยังไม่ลงลึกในคาบนี้:
- บันทึก binding ลงไฟล์ถาวร
- preset หลายชุดต่อผู้เล่นหลายคน

---
## Checklist ก่อนจบคาบ
- `Jump` action ทำงานได้จริง
- `Move` action แบบ `Vector2 composite` ทำงานครบแกน
- keyboard และ gamepad ใช้งานได้กับ action เดียวกัน
- โค้ดแยกหน้าที่ input และ motor ชัดเจน
- อธิบายความต่างของ `Collision` และ `Trigger` ได้จากผลทดลอง
- ทำระบบคะแนนจาก `tag` ได้ และเชื่อมกับกติกาเกมพื้นฐานได้

---
## งานที่ต้องส่ง
[mode:activity]
- Scene ที่มี `PlayerSphere` ควบคุมได้ทั้งกระโดดและเคลื่อนที่
- `Input Actions` asset ที่มีอย่างน้อย `Jump`, `Move`
- โค้ดอย่างน้อย 6 script: input jump, input move, motor, collision reporter, pickup trigger, score system
- รายงาน 1 หน้า: โครงสร้าง layer ของ input และเหตุผลที่ออกแบบแบบนี้

---
## สรุปบทที่ 03
- `Input System` ทำหน้าที่เป็น layer คั่นระหว่างอุปกรณ์และ gameplay
- เริ่มจาก action เดียวแบบง่าย ช่วยให้นักศึกษาเห็น flow ชัด
- เมื่อเพิ่ม `Vector2 composite` จะเห็นพลังของ action abstraction
- interaction กับ physics object ต้องแยก use case ให้ชัด ระหว่าง collision และ trigger
- ระบบคะแนนจาก `tag` คือจุดเริ่มต้นของการออกแบบกติกาเกมแบบขยายต่อได้

---
## เตรียมบทถัดไป
บทที่ 04 จะต่อยอดไปที่ระบบ physics-driven gameplay และ interaction ที่ซับซ้อนขึ้น

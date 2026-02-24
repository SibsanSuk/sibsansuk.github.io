public interface ISwitchable
{
    public bool IsActive { get; }
    public void Activate();
    public void Deactivate();
}

public class Switch : MonoBehaviour
{
    public ISwitchable client; // พึ่งพา Abstraction แทน
    public void Toggle()
    {
        if (client.IsActive) { client.Deactivate(); }
        else { client.Activate(); }
    }
}

public class Door : MonoBehaviour, ISwitchable
{
    private bool isActive;
    public bool IsActive => isActive;

    public void Activate() { isActive = true; Debug.Log("ประตูเปิด"); }
    public void Deactivate() { isActive = false; Debug.Log("ประตูปิด"); }
}